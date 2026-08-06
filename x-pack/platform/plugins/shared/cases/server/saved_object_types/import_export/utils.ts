/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import { escapeKuery } from '@kbn/es-query';
import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  CaseUserActionWithoutReferenceIds,
  AttachmentAttributesWithoutRefs,
} from '../../../common/types/domain';
import type { AttachmentAttributesV2 } from '../../../common/types/domain/attachment/v2';
import type { Template } from '../../../common/types/domain/template/latest';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import { isRefField } from '../../../common/types/domain/template/fields';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import { defaultSortField } from '../../common/utils';
import type { CasePersistedAttributes } from '../../common/types/case';

export async function getAttachmentsAndUserActionsForCases(
  savedObjectsClient: SavedObjectsClientContract,
  caseIds: string[]
): Promise<
  Array<
    SavedObject<
      AttachmentAttributesWithoutRefs | AttachmentAttributesV2 | CaseUserActionWithoutReferenceIds
    >
  >
> {
  const attachmentTypes = [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT];

  const [attachments, userActions] = await Promise.all([
    getAssociatedObjects<AttachmentAttributesWithoutRefs | AttachmentAttributesV2>({
      savedObjectsClient,
      caseIds,
      sortField: defaultSortField,
      type: attachmentTypes,
    }),
    getAssociatedObjects<CaseUserActionWithoutReferenceIds>({
      savedObjectsClient,
      caseIds,
      sortField: defaultSortField,
      type: CASE_USER_ACTION_SAVED_OBJECT,
    }),
  ]);

  return [...attachments, ...userActions];
}

async function getAssociatedObjects<T>({
  savedObjectsClient,
  caseIds,
  sortField,
  type,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
  sortField: string;
  type: string | string[];
}): Promise<Array<SavedObject<T>>> {
  const references = caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id }));
  const finder = savedObjectsClient.createPointInTimeFinder<T>({
    type,
    hasReferenceOperator: 'OR',
    hasReference: references,
    perPage: MAX_DOCS_PER_PAGE,
    sortField,
    sortOrder: 'asc',
  });

  let result: Array<SavedObject<T>> = [];
  for await (const findResults of finder.find()) {
    result = result.concat(findResults.saved_objects);
  }

  return result;
}

/**
 * Gathers the `cases-templates` and `cases-field-definition` saved objects needed to make a
 * case export self-contained with respect to Templates v2.
 *
 * For each exported case:
 *  - If the case references a template (via `attributes.template.{ id, version }`), the matching
 *    `cases-templates` SO is included (soft-deleted ones too, since cases may still reference a
 *    template that was later removed).
 *  - Every field-definition (`cases-field-definition`) that a bundled template's YAML definition
 *    references via a `$ref` field is included.
 *  - All `isGlobal` field definitions for the owners of the exported cases are always included —
 *    global fields render on every case regardless of whether a template was applied, so a
 *    template-less case with `extended_fields` keyed by global definitions must bundle them to
 *    remain self-contained.
 *
 * When no exported case has an owner, the function returns `[]` immediately.
 * The template query is skipped when no case references a template (no `cases-templates` SOs are
 * fetched), but the field-definition query still runs for global fields.
 *
 * The links between cases, templates, and field definitions are purely logical (by attribute
 * value, not SO `references`), so SO import ID-remapping does not break them.
 *
 * NOTE: template default connectors (`definition.connector`) are NOT bundled — connectors are
 * external action SOs, and per the existing import/export behavior the connector is reset to
 * "none" on import when the target does not have the referenced connector.
 */
export async function getTemplatesAndFieldDefinitionsForCases(
  savedObjectsClient: SavedObjectsClientContract,
  cases: Array<SavedObject<CasePersistedAttributes>>,
  logger: Logger
): Promise<Array<SavedObject<Template | FieldDefinition>>> {
  // 1. Collect unique (templateId, version) pairs referenced by the exported cases,
  //    and unique non-empty owners for the field-definition query.
  const seenTemplateRefs = new Set<string>();
  const templateRefs: Array<{ templateId: string; version: number }> = [];

  for (const caseObj of cases) {
    const t = caseObj.attributes.template;
    if (t) {
      const key = `${t.id}:${t.version}`;
      if (!seenTemplateRefs.has(key)) {
        seenTemplateRefs.add(key);
        templateRefs.push({ templateId: t.id, version: t.version });
      }
    }
  }

  const owners = [...new Set(cases.map((c) => c.attributes.owner).filter((o): o is string => !!o))];

  // Nothing to fetch — no owners means no field definitions can exist, and without
  // owners we cannot form a useful query.
  if (owners.length === 0) {
    return [];
  }

  // 2. Fetch all referenced template SOs in one query (only when needed).
  //    Do NOT filter on `deletedAt` — cases may still reference a soft-deleted template.
  let templateSOs: Array<SavedObject<Template>> = [];
  if (templateRefs.length > 0) {
    const templateFilter = templateRefs
      .map(
        ({ templateId, version }) =>
          `(${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateId: "${escapeKuery(
            templateId
          )}" AND ${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateVersion: ${version})`
      )
      .join(' OR ');

    const templateFindResult = await savedObjectsClient.find<Template>({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      filter: templateFilter,
      perPage: Math.min(templateRefs.length, MAX_DOCS_PER_PAGE),
    });

    templateSOs = templateFindResult.saved_objects;
  }

  // 3. Fetch ALL field definitions for the owners of the exported cases.
  //    `isGlobal` filtering is done in application code rather than via KQL because the boolean
  //    may not be reliably indexed for all documents (see FieldDefinitionsService comment).
  const ownerFilter = owners
    .map((o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`)
    .join(' OR ');

  const fieldDefFindResult = await savedObjectsClient.find<FieldDefinition>({
    type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
    filter: ownerFilter,
    perPage: MAX_FIELD_DEFINITIONS_PER_OWNER * owners.length,
  });

  const allFieldDefSOs = fieldDefFindResult.saved_objects;

  // 4. Select field defs to include:
  //    a. Global field definitions (rendered on every case regardless of template).
  const globalFieldDefs = allFieldDefSOs.filter((fd) => fd.attributes.isGlobal === true);

  //    b. Field definitions $ref'd by the bundled templates.
  //       When templateSOs is empty, collectRefFieldNamesByOwner returns an empty set so
  //       no additional defs are selected via this path.
  const referencedNames = collectRefFieldNamesByOwner(templateSOs, logger);
  const referencedFieldDefs = allFieldDefSOs.filter((fd) =>
    referencedNames.has(`${fd.attributes.owner}:${fd.attributes.name}`)
  );

  // 5. Dedupe field defs by SO id (a def could be both global and $ref'd).
  const fieldDefById = new Map<string, SavedObject<FieldDefinition>>();
  for (const fd of [...globalFieldDefs, ...referencedFieldDefs]) {
    fieldDefById.set(fd.id, fd);
  }

  return [...templateSOs, ...fieldDefById.values()];
}

/**
 * Parses each template's YAML definition and collects the `$ref` field names as
 * `"owner:name"` keys for fast membership testing.
 *
 * Errors are logged and skipped — a malformed definition should not abort the export.
 */
function collectRefFieldNamesByOwner(
  templateSOs: Array<SavedObject<Template>>,
  logger: Logger
): Set<string> {
  const names = new Set<string>();

  for (const so of templateSOs) {
    const { definition, templateId, owner } = so.attributes;
    if (definition) {
      try {
        const parsed = ParsedTemplateDefinitionSchema.parse(yamlParse(definition));
        for (const field of parsed.fields) {
          if (isRefField(field)) {
            names.add(`${owner}:${field.$ref}`);
          }
        }
      } catch (err) {
        logger.warn(
          `Failed to parse template definition for templateId "${templateId}" during export; ` +
            `$ref field definitions will not be included: ${err}`
        );
      }
    }
  }

  return names;
}
