/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { castArray } from 'lodash';
import { escapeKuery } from '@kbn/es-query';
import { parse as parseYaml } from 'yaml';
import type {
  CreateFieldDefinitionInput,
  FieldDefinition,
  UpdateFieldDefinitionInput,
} from '../../../common/types/domain/field_definition/v1';
import { InlineFieldSchema } from '../../../common/types/domain/template/fields';
import { validateExtendedFieldValueSizes } from '../../../common/types/domain/template/validate_extended_fields';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  MAX_EXTENDED_FIELD_VALUE_BYTES,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import type { FieldDefinitionsFindResponse } from '../../../common/types/api/field_definition/v1';
import { getYamlDefaultAsString } from '../../../common/utils';

const sortGlobalFieldDefinitions = (fieldDefinitions: FieldDefinition[]): FieldDefinition[] =>
  fieldDefinitions
    .map((fieldDefinition, index) => ({
      fieldDefinition,
      index,
      displayOrder: fieldDefinition.displayOrder ?? index,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.index - b.index)
    .map(({ fieldDefinition }) => fieldDefinition);

export class FieldDefinitionsService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      /**
       * Bound, parameterless callback that asks the cases-analytics v2
       * subsystem to recompute and persist this space's runtime field map.
       * Fire-and-forget — never awaited; never throws past this service.
       *
       * Called at the tail of every field-definition create / update / delete.
       * A field definition contributes a `case.<snake>` runtime field when it is
       * global (`isGlobal: true`) or referenced by a template via `$ref`, so a
       * mutation here can shift a space's runtime field map exactly like a
       * template edit does. The cases client factory binds this to the current
       * request's space + SO client; when v2 is disabled the bound function is a
       * no-op (see `V2_NOOP_DATA_VIEW_REFRESHER`).
       */
      refreshAnalyticsV2DataView: () => void;
    }
  ) {}

  /**
   * Returns field definitions for the given owner(s).
   *
   * `isGlobal: true`  — returns only definitions flagged as global.
   * `isGlobal: false` — same as `undefined`: returns ALL definitions.
   *
   * NOTE: `isGlobal` filtering is done in application code (not via KQL) because
   * the `isGlobal` boolean is not reliably indexed for all documents (e.g. documents
   * created before the mapping was applied). In-app filtering on `_source` is always
   * accurate.
   */
  async getFieldDefinitions(
    owner: string | string[],
    { isGlobal }: { isGlobal?: boolean } = {}
  ): Promise<FieldDefinitionsFindResponse> {
    // Dedupe to prevent duplicate owners from inflating the perPage multiplier.
    const owners = [...new Set(castArray(owner))];

    if (owners.length === 0) {
      return { fieldDefinitions: [], total: 0 };
    }

    const ownerFilter = owners
      .map((o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`)
      .join(' OR ');

    const result = await this.dependencies.unsecuredSavedObjectsClient.find<FieldDefinition>({
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      filter: ownerFilter,
      perPage: MAX_FIELD_DEFINITIONS_PER_OWNER * owners.length,
    });

    const allDefs = result.saved_objects.map((so) => so.attributes);

    const fieldDefinitions =
      isGlobal === true
        ? sortGlobalFieldDefinitions(allDefs.filter((fd) => fd.isGlobal === true))
        : allDefs;

    return {
      fieldDefinitions,
      total: fieldDefinitions.length,
    };
  }

  /**
   * Fetches `isGlobal: true` field definitions for extended-field search.
   * When `owner` is omitted or empty, returns global defs for all owners
   * (mirrors `getTemplateVersionsForExtendedFieldSearch` semantics).
   */
  async getGlobalFieldDefinitionsForSearch(params: {
    owner?: string[];
  }): Promise<FieldDefinition[]> {
    const owners = params.owner?.length ? [...new Set(params.owner.filter(Boolean))] : [];
    const ownerFilter =
      owners.length > 0
        ? owners
            .map(
              (o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`
            )
            .join(' OR ')
        : undefined;

    const result = await this.dependencies.unsecuredSavedObjectsClient.find<FieldDefinition>({
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      filter: ownerFilter,
      perPage: 10000,
    });

    return result.saved_objects.map((so) => so.attributes).filter((fd) => fd.isGlobal === true);
  }

  async getFieldDefinition(id: string): Promise<SavedObject<FieldDefinition>> {
    return this.dependencies.unsecuredSavedObjectsClient.get<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id
    );
  }

  async createFieldDefinition(
    input: CreateFieldDefinitionInput
  ): Promise<SavedObject<FieldDefinition>> {
    this.assertFieldDefinitionIsValid(input.definition);

    const id = uuidv4();
    const globalFieldDefinitions = input.isGlobal
      ? await this.getFieldDefinitions(input.owner, { isGlobal: true })
      : undefined;
    const created = await this.dependencies.unsecuredSavedObjectsClient.create<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      {
        ...input,
        fieldDefinitionId: id,
        // Append after the highest existing order, not at `total`: after a deletion the count
        // no longer equals max(displayOrder) + 1, and reusing a taken order makes the sort fall
        // back to find-order tie-breaking, landing the new field somewhere arbitrary.
        ...(globalFieldDefinitions
          ? {
              displayOrder:
                globalFieldDefinitions.fieldDefinitions.reduce(
                  (max, { displayOrder }) => Math.max(max, displayOrder ?? -1),
                  -1
                ) + 1,
            }
          : {}),
      },
      { id }
    );

    // A new definition can introduce a runtime field (global, or once a template
    // $refs it). Tell cases-analytics v2 to recompute the per-space map.
    // Fire-and-forget; failures are caught + logged inside the v2 service.
    this.dependencies.refreshAnalyticsV2DataView();

    return created;
  }

  async updateFieldDefinition(
    id: string,
    input: UpdateFieldDefinitionInput
  ): Promise<SavedObject<FieldDefinition>> {
    this.assertFieldDefinitionIsValid(input.definition);

    await this.dependencies.unsecuredSavedObjectsClient.update<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id,
      input
    );

    // An edit may flip `isGlobal`, rename the field, or change its type — any of
    // which shifts a space's runtime field map. Tell v2 to refresh.
    this.dependencies.refreshAnalyticsV2DataView();

    return this.getFieldDefinition(id);
  }

  async deleteFieldDefinition(id: string): Promise<void> {
    await this.dependencies.unsecuredSavedObjectsClient.delete(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id
    );

    // A removed definition drops its runtime field. Tell v2 to refresh.
    this.dependencies.refreshAnalyticsV2DataView();
  }

  /**
   * A field-library default is copied into a case's `extended_fields` when a
   * template references it. Validate the persisted representation here as the
   * definition is written, rather than waiting until a case is created.
   */
  private assertFieldDefinitionIsValid(definition: string): void {
    let yamlDefinition: unknown;
    try {
      yamlDefinition = parseYaml(definition);
    } catch {
      throw Boom.badRequest('Invalid YAML definition');
    }

    const parsedDefinition = InlineFieldSchema.safeParse(yamlDefinition);
    if (!parsedDefinition.success) {
      const validationErrors = parsedDefinition.error.issues
        .map(({ path, message }) => (path.length > 0 ? `${path.join('.')}: ${message}` : message))
        .join('; ');
      throw Boom.badRequest(`Invalid field definition: ${validationErrors}`);
    }

    const defaultValue = parsedDefinition.data.metadata?.default;
    if (defaultValue === undefined) {
      return;
    }

    const value = getYamlDefaultAsString(defaultValue);
    const errors = validateExtendedFieldValueSizes({ [parsedDefinition.data.name]: value });
    if (errors.length > 0) {
      throw Boom.badRequest(
        `Field definition "${parsedDefinition.data.name}" default exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
      );
    }
  }
}
