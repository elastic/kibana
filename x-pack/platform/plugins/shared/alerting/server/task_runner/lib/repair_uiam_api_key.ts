/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { UIAM_LOGS_REPAIR_TAGS } from '../../constants';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { isErrorWithReason } from '../../lib/error_with_reason';
import {
  isMissingUiamApiKeyMessage,
  UIAM_API_KEY_MISSING_CODE,
} from '../../lib/uiam_api_key_error';
import type { RuleResultServiceResults } from '../../monitoring/rule_result_service';
import { API_KEY_PENDING_INVALIDATION_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RawRule } from '../../types';
import { getDecryptedRule } from '../rule_loader';
import { ApiKeyType, type TaskRunnerContext } from '../types';

export interface RepairUiamApiKeyParams {
  context: TaskRunnerContext;
  logger: Logger;
  ruleId: string;
  spaceId: string;
}

interface UiamAuthenticationError {
  statusCode?: number;
  meta?: { statusCode?: number };
  body?: {
    error?: {
      authentication_error_code?: string;
      caused_by?: { authentication_error_code?: string };
    };
  };
}

/**
 * Returns true when a rule run failed because UIAM no longer knows the API key it authenticated
 * with. Unwraps the alerting framework's error decoration ({@link isErrorWithReason}) and the
 * standard `cause` chain to reach the Elasticsearch error underneath.
 */
export const isMissingUiamApiKeyRunError = (error: unknown): boolean => {
  // Three levels covers what rule runs actually produce: the raw error, an `ErrorWithReason`
  // wrapping it, and a rule type that rethrew with the original as `cause`.
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth++) {
    const { statusCode, meta, body } = current as UiamAuthenticationError;
    // Elasticsearch reports the code on the error itself or on the exception it wraps, depending on
    // which authentication path failed.
    if (
      (statusCode ?? meta?.statusCode) === 401 &&
      (body?.error?.authentication_error_code === UIAM_API_KEY_MISSING_CODE ||
        body?.error?.caused_by?.authentication_error_code === UIAM_API_KEY_MISSING_CODE)
    ) {
      return true;
    }
    current = isErrorWithReason(current as Error)
      ? (current as { error: Error }).error
      : (current as { cause?: unknown }).cause;
  }

  return false;
};

/**
 * Returns true when a rule reported a failed run because UIAM no longer knows the API key it
 * authenticated with, for rule types that record the failure instead of throwing it — Security
 * Solution's detection rules report through {@link RuleResultService}, so the run never reaches the
 * task runner's catch and {@link isMissingUiamApiKeyRunError} never sees the error.
 *
 * `userError` errors are ignored: those are the rule author's to fix and do not describe a
 * credential Kibana granted.
 */
export const isMissingUiamApiKeyLastRunError = (
  errors: RuleResultServiceResults['errors']
): boolean =>
  errors.some(({ message, userError }) => !userError && isMissingUiamApiKeyMessage(message));

/**
 * Re-grants a rule's unusable UIAM API key by converting its Elasticsearch API key into a fresh
 * UIAM one and persisting it on the rule, so the rule's next scheduled run authenticates with a
 * working credential instead of staying broken until someone re-saves it.
 *
 * A rule whose Elasticsearch key the user supplied (`apiKeyCreatedByUser`) but which also holds a
 * UIAM key is repaired differently: that combination is one the rules client refuses to create, so
 * the UIAM key can only be the residue of the historical clone/update leak, and it is removed —
 * letting the next run fall back to the user's own key — rather than re-granted over a credential
 * that was never this rule's to hold.
 *
 * Does nothing when there is no key to replace, when a user-keyed rule holds nothing but its own
 * key, or when the rule has no Elasticsearch key to convert (UIAM-only rules).
 */
export const repairUiamApiKey = async ({
  context,
  logger,
  ruleId,
  spaceId,
}: RepairUiamApiKeyParams): Promise<void> => {
  const logTags = [...UIAM_LOGS_REPAIR_TAGS, ruleId];
  const { uiamConvert } = context;

  if (!context.shouldGrantUiam || context.apiKeyType !== ApiKeyType.UIAM || !uiamConvert) {
    logger.debug(
      'Not re-granting the UIAM API key: this deployment does not run rules with UIAM API keys.',
      { tags: logTags }
    );
    return;
  }

  const savedObjectsClient = context.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, API_KEY_PENDING_INVALIDATION_TYPE],
  });
  // Set once the convert API has minted a key, so a failed write can tell whether there is a live
  // UIAM key left over to clean up.
  let freshUiamApiKey: string | undefined;
  // What the catch below reports this attempt as: the leak-removal branch swaps it out so a failed
  // write is not misreported as a failed re-grant.
  let failedRepairDescription = 're-grant the UIAM API key for';

  try {
    // Re-read the rule rather than reuse what the run loaded: the write below needs the current
    // `version` to lose a concurrency race rather than provoke a spurious one, and re-reading also
    // means a rule re-saved mid-run is judged on the credential it holds now.
    const { rawRule, version } = await getDecryptedRule(context, ruleId, spaceId);
    const { apiKey, uiamApiKey, apiKeyCreatedByUser } = rawRule;

    // Each reason gets its own message: these are the lines an operator reads to understand why a
    // broken rule was left alone, so "which check skipped it" has to be obvious from the log alone.
    if (!uiamApiKey) {
      logger.debug('Not re-granting the UIAM API key: the rule does not have one.', {
        tags: logTags,
      });
      return;
    }

    if (apiKeyCreatedByUser === true) {
      if (!apiKey) {
        logger.debug(
          'Not re-granting the UIAM API key: it was created by the user, who manages its lifecycle.',
          { tags: logTags }
        );
        return;
      }

      // A user-keyed rule holding a UIAM key alongside its Elasticsearch key is a state the rules
      // client refuses to create (`apiKeyAsAlertAttributes` throws on it): it is the residue of the
      // historical clone/update leak, where the framework's UIAM key survived the user supplying
      // their own key. The leaked key follows another lifecycle — for clones it is literally the
      // source rule's key — so it can vanish from UIAM at any time, which is what stranded this
      // run. There is nothing to re-grant (the user's key is not Kibana's to convert); removing the
      // leak makes the next run fall back to the user's Elasticsearch key. The removed key is NOT
      // queued for invalidation: a clone's source rule may still be running on it. The external
      // verdict is cleared with the key it described.
      failedRepairDescription = 'remove the leaked UIAM API key from';
      await savedObjectsClient.update<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        ruleId,
        { ...rawRule, uiamApiKey: null, uiamApiKeyExternal: null },
        {
          mergeAttributes: false,
          version,
          namespace: context.spaceIdToNamespace(spaceId),
        }
      );

      logger.info(
        'Removed the leaked UIAM API key from the rule after it failed to authenticate; the rule will run with its user-provided API key.',
        { tags: logTags }
      );
      return;
    }

    if (!apiKey) {
      logger.debug(
        'Not re-granting the UIAM API key: the rule has no Elasticsearch API key to convert.',
        { tags: logTags }
      );
      return;
    }

    const result = (await uiamConvert([apiKey]))?.results?.[0];

    if (result?.status !== 'success') {
      logger.warn(
        `Failed to re-grant the UIAM API key for the rule: the UIAM convert API did not return a key${
          result?.status === 'failed' ? ` ([${result.code}] ${result.message})` : ''
        }.`,
        { tags: logTags }
      );
      return;
    }

    freshUiamApiKey = Buffer.from(`${result.id}:${result.key}`).toString('base64');

    await savedObjectsClient.update<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      ruleId,
      // A partial update would corrupt the encrypted `apiKey` / `uiamApiKey` attributes, so the
      // full (decrypted) attribute set is written back and re-encrypted, as the UIAM provisioning
      // task does. `version` makes the write lose to a concurrent update rather than clobber it.
      { ...rawRule, uiamApiKey: freshUiamApiKey },
      {
        mergeAttributes: false,
        version,
        namespace: context.spaceIdToNamespace(spaceId),
      }
    );

    logger.info(
      'Re-granted the UIAM API key for the rule after it failed to authenticate with the previous one.',
      { tags: logTags }
    );
  } catch (error) {
    logger.warn(`Failed to ${failedRepairDescription} the rule: ${error.message}`, {
      tags: logTags,
    });

    // The convert API had already minted a key, and Elasticsearch rejected the write outright — a
    // concurrent update won the version check, or the rule is gone — so that key is certainly
    // referenced by nothing and is queued for invalidation. Any other failure (a timeout, a dropped
    // connection) may have committed after all, and revoking a key that did persist would break
    // every subsequent run, so those are left alone as a bounded leak.
    if (
      freshUiamApiKey &&
      (SavedObjectsErrorHelpers.isConflictError(error) ||
        SavedObjectsErrorHelpers.isNotFoundError(error))
    ) {
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [freshUiamApiKey] },
        logger,
        savedObjectsClient
      );
    }
  }
};
