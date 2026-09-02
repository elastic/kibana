/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { PERMANENT_UIAM_CONVERSION_ERROR_CODES } from '@kbn/uiam-api-keys-provisioning-status';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';

interface UiamApiKeyRepairRecord {
  status?: string;
  message?: string;
  errorCode?: string;
  apiKeyId?: string;
}

export interface WriteUiamApiKeyRepairRecordParams {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  logTags: string[];
  ruleId: string;
  /** Elasticsearch API key id the repair was attempted for; scopes the verdict to that credential. */
  apiKeyId?: string;
  status: UiamApiKeyProvisioningStatus;
  message?: string;
  errorCode?: string;
}

/**
 * Returns the id half of a base64 `id:key` API key, or undefined when there is nothing usable to
 * read. The id is what a repair record is keyed on, so an unparseable key has to yield no id rather
 * than a wrong one: a record keyed on the wrong credential would suppress a repair that should run.
 */
export const getApiKeyId = (apiKey?: string | null): string | undefined => {
  if (!apiKey) {
    return undefined;
  }

  const [id, ...rest] = Buffer.from(apiKey, 'base64').toString().split(':');

  return id && rest.length > 0 ? id : undefined;
};

/**
 * Reads the provisioning status record for a rule, which is also where the healer records its own
 * attempts — one document, two consumers, so the healer and the UIAM provisioning task cannot
 * independently retry the same doomed conversion.
 *
 * A missing record means nothing has been attempted yet. Any other read failure is reported as
 * missing too: refusing to repair because the bookkeeping could not be read would turn a transient
 * saved objects failure into a rule that stays broken.
 */
export const readUiamApiKeyRepairRecord = async ({
  savedObjectsClient,
  logger,
  logTags,
  ruleId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  logTags: string[];
  ruleId: string;
}): Promise<UiamApiKeyRepairRecord | undefined> => {
  try {
    const record = await savedObjectsClient.get<UiamApiKeyRepairRecord>(
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      ruleId
    );

    return record?.attributes;
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      logger.warn(
        `Could not read the UIAM API key provisioning status for the rule, so the re-grant proceeds as a first attempt: ${error.message}`,
        { tags: logTags }
      );
    }

    return undefined;
  }
};

/**
 * Returns why a repair should not be attempted again, or undefined when it should go ahead.
 *
 * Two things stop a retry, and they are scoped differently on purpose:
 *
 * - A permanent UIAM verdict ({@link PERMANENT_UIAM_CONVERSION_ERROR_CODES}) is about the identity
 *   that created the key, not the key itself, so re-minting the Elasticsearch key cannot change the
 *   answer. It stops the healer regardless of which credential the rule holds now, and it is honored
 *   whether the healer or the provisioning task recorded it.
 * - Any other recorded attempt is scoped to the credential it was made for. This covers the loop
 *   shape a failure-only breaker misses: a conversion that *succeeds* and still leaves the rule
 *   failing would otherwise mint a fresh key on every run. Re-saving the rule re-mints its
 *   Elasticsearch key under a new id, which resets this for free — so a genuine fix is never left
 *   suppressed by a stale record.
 */
export const getUiamApiKeyRepairSkipReason = ({
  record,
  apiKeyId,
}: {
  record?: UiamApiKeyRepairRecord;
  apiKeyId?: string;
}): string | undefined => {
  if (!record) {
    return undefined;
  }

  const { status, errorCode, apiKeyId: recordedApiKeyId, message } = record;

  if (
    status === UiamApiKeyProvisioningStatus.FAILED &&
    errorCode &&
    PERMANENT_UIAM_CONVERSION_ERROR_CODES.includes(errorCode)
  ) {
    return `a permanent UIAM verdict is already recorded for this rule (${
      message ?? `[${errorCode}]`
    })`;
  }

  if (recordedApiKeyId && apiKeyId && recordedApiKeyId === apiKeyId) {
    return `it was already attempted for this rule's current API key and did not fix the rule${
      message ? ` (${message})` : ''
    }`;
  }

  return undefined;
};

/**
 * Records the outcome of a repair attempt on the shared provisioning status document, so the next
 * failing run can tell that this credential has already been tried.
 *
 * Best-effort: a rule that ran and failed should not also fail its bookkeeping loudly. A write that
 * does not land only costs one extra attempt on the next run.
 */
export const writeUiamApiKeyRepairRecord = async ({
  savedObjectsClient,
  logger,
  logTags,
  ruleId,
  apiKeyId,
  status,
  message,
  errorCode,
}: WriteUiamApiKeyRepairRecordParams): Promise<void> => {
  try {
    await savedObjectsClient.create(
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
      {
        '@timestamp': new Date().toISOString(),
        entityId: ruleId,
        entityType: UiamApiKeyProvisioningEntityType.RULE,
        status,
        ...(message ? { message } : {}),
        ...(errorCode ? { errorCode } : {}),
        ...(apiKeyId ? { apiKeyId } : {}),
      },
      { id: ruleId, overwrite: true }
    );
  } catch (error) {
    logger.warn(
      `Failed to record the UIAM API key re-grant attempt for the rule, so it may be attempted again: ${error.message}`,
      { tags: logTags }
    );
  }
};
