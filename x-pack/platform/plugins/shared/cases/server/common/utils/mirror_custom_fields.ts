/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import type { FieldLinkageMalformedErrorAttributes } from '../../../common/constants/error_codes';
import { createTypedApiError } from '../api_errors';
import type { FieldDefinitionsService } from '../../services';
import type { FieldLinkIndexes } from './field_link_resolution';
import { buildFieldLinkIndexes } from './field_link_resolution';

type MalformedField = FieldLinkageMalformedErrorAttributes['fields'][number];

/**
 * Loads the owner's field definitions and builds the in-memory link indexes for
 * write-time pairing. One bounded SO find per request (≤ definitions cap).
 */
export const loadFieldLinkIndexes = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService
): Promise<FieldLinkIndexes> => {
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
  return buildFieldLinkIndexes(fieldDefinitions);
};

/** Rejects the case write with a structured `field_linkage_malformed` 400. */
export const throwIfMalformedFieldLinkage = (malformedFields: MalformedField[]): void => {
  if (malformedFields.length === 0) {
    return;
  }
  const detail = malformedFields.map(({ key, reason }) => `"${key}" (${reason})`).join('; ');
  throw createTypedApiError({
    statusCode: 400,
    message:
      `Cannot mirror custom fields into extended fields — the field-definition linkage is ` +
      `malformed for: ${detail}. Resolve the field library state and retry.`,
    attributes: {
      code: CASES_API_ERROR_CODES.FIELD_LINKAGE_MALFORMED,
      fields: malformedFields,
    },
  });
};

/**
 * Emits the skip diagnostic for unresolved keys. A warning (not an error): the
 * v1 value is still written; only the v2 mirror is deferred until the link
 * exists (the configure path creates it, the reconciliation phase backfills).
 */
export const logUnresolvedMirrorKeys = (
  unresolvedKeys: string[],
  { owner, logger }: { owner: string; logger: Logger }
): void => {
  if (unresolvedKeys.length === 0) {
    return;
  }
  logger.warn(
    `Skipped mirroring custom fields [${unresolvedKeys.join(', ')}] (owner: "${owner}") into ` +
      `extended_fields: no linked field definition resolved. Values remain readable through ` +
      `the v1 customFields API and will be reconciled once linked.`
  );
};
