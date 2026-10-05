/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Case,
  ExternalSyncConflictStrategy,
  ExternalSyncFieldMappings,
} from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain';
import { validateExtendedFields } from '../../../common/types/domain/template/validate_extended_fields';
import { getFieldSnakeKey } from '../../../common/utils/template_fields';
import {
  coerceExternalFieldValue,
  pullsFromExternal,
} from '../../../common/utils/external_sync_fields';
import type { CasesClientArgs } from '..';
import { resolveApplicableFields } from './applicable_fields';

export interface MappedFieldsPatch {
  extendedFields: Record<string, string>;
  updatedFields: string[];
  conflictedFields: string[];
}

const EMPTY: MappedFieldsPatch = { extendedFields: {}, updatedFields: [], conflictedFields: [] };

/** Whether any pulled mapping keeps the Kibana value, so the caller knows to load the edit history. */
export const mappingsKeepKibanaValue = (
  mappings: ExternalSyncFieldMappings | undefined,
  defaultStrategy: ExternalSyncConflictStrategy
): boolean =>
  (mappings ?? []).some(
    (mapping) =>
      pullsFromExternal(mapping.direction) &&
      (mapping.conflictStrategy ?? defaultStrategy) === 'kibana'
  );

/**
 * Reads the mapped external fields off the raw incident and turns them into an
 * `extended_fields` patch. A value the target field would reject is skipped and logged
 * rather than failing the whole sync.
 */
export const buildMappedFieldsPatch = async ({
  theCase,
  incident,
  mappings,
  defaultStrategy,
  changedInKibana,
  clientArgs,
}: {
  theCase: Case;
  incident: Record<string, unknown>;
  mappings: ExternalSyncFieldMappings | undefined;
  defaultStrategy: ExternalSyncConflictStrategy;
  changedInKibana: Set<string>;
  clientArgs: Pick<CasesClientArgs, 'services' | 'logger'>;
}): Promise<MappedFieldsPatch> => {
  const pulled = (mappings ?? []).filter((mapping) => pullsFromExternal(mapping.direction));
  if (pulled.length === 0) {
    return EMPTY;
  }

  const {
    services: { templatesService, fieldDefinitionsService },
    logger,
  } = clientArgs;

  const applicable = await resolveApplicableFields({
    owner: theCase.owner,
    templateId: theCase.template?.id,
    templatesService,
    fieldDefinitionsService,
  });
  const fieldsByKey = new Map(
    applicable.map(({ field }) => [getFieldSnakeKey(field.name, field.type), field])
  );

  const patch: MappedFieldsPatch = { extendedFields: {}, updatedFields: [], conflictedFields: [] };

  for (const mapping of pulled) {
    const field = fieldsByKey.get(mapping.caseField);
    const value = coerceExternalFieldValue(incident[mapping.externalField]);
    const unchanged = value === undefined || value === theCase.extended_fields?.[mapping.caseField];

    if (field == null) {
      logger.debug(`case field ${mapping.caseField} is not applicable to case ${theCase.id}`);
    } else if (!unchanged) {
      const errors = validateExtendedFields({ [mapping.caseField]: value }, [field], {
        partial: true,
      });
      const strategy = mapping.conflictStrategy ?? defaultStrategy;

      if (errors.length > 0) {
        logger.warn(
          `Skipping external field ${mapping.externalField} for case ${theCase.id}: ${errors.join(
            '; '
          )}`
        );
      } else if (strategy === 'kibana' && changedInKibana.has(UserActionTypes.extended_fields)) {
        patch.conflictedFields.push(mapping.caseField);
      } else {
        patch.extendedFields[mapping.caseField] = value;
        patch.updatedFields.push(mapping.caseField);
      }
    }
  }

  return patch;
};
