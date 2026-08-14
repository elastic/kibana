/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { UIAM_LOGS_REPAIR_TAGS } from '../../constants';
import { isErrorWithReason } from '../../lib/error_with_reason';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RawRule } from '../../types';
import { getDecryptedRule } from '../rule_loader';
import { ApiKeyType, type TaskRunnerContext } from '../types';

export interface RepairUiamApiKeyParams {
  context: TaskRunnerContext;
  logger: Logger;
  ruleId: string;
  spaceId: string;
}

/**
 * UIAM's `APIKEY_MISSING`, which Elasticsearch surfaces as `authentication_error_code` on the 401 it
 * returns when UIAM does not know the API key a request presented — the key was deleted, so the only
 * recovery is a new one.
 *
 * The single code is the point: every other API key rejection UIAM reports leaves the key intact or
 * is not understood well enough to act on. `APIKEY_EXPIRED` (`0xE436AE`) is not known to be
 * reachable for keys Kibana grants itself, since a converted key inherits the expiration of the
 * Elasticsearch key behind it; `APIKEY_REVOKED` (`0xD38358`) would mean re-granting over a
 * deliberate revocation; and `APIKEY_CLIENT_AUTH1`/`2` mean the key is valid but Kibana presented
 * the wrong client authentication. A bare 401 says nothing about the key at all.
 */
const UIAM_API_KEY_MISSING_CODE = '0x28D520';

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
 * Re-grants a rule's unusable UIAM API key by converting its Elasticsearch API key into a fresh
 * UIAM one and persisting it on the rule, so the rule's next scheduled run authenticates with a
 * working credential instead of staying broken until someone re-saves it.
 *
 * Does nothing when there is no key to replace, when the key is the user's to rotate, or when the
 * rule has no Elasticsearch key to convert (UIAM-only rules).
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
    logger.debug('Not re-granting the UIAM API key for the rule.', { tags: logTags });
    return;
  }

  try {
    // Re-read the rule rather than reuse what the run loaded: the write below needs the current
    // `version` to lose a concurrency race rather than provoke a spurious one, and re-reading also
    // means a rule re-saved mid-run is judged on the credential it holds now.
    const { rawRule, version } = await getDecryptedRule(context, ruleId, spaceId);
    const { apiKey, uiamApiKey, apiKeyCreatedByUser } = rawRule;

    if (!uiamApiKey || !apiKey || apiKeyCreatedByUser === true) {
      logger.debug('Not re-granting the UIAM API key for the rule.', { tags: logTags });
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

    await context.savedObjects
      .getUnsafeInternalClient({ includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE] })
      .update<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        ruleId,
        // A partial update would corrupt the encrypted `apiKey` / `uiamApiKey` attributes, so the
        // full (decrypted) attribute set is written back and re-encrypted, as the UIAM provisioning
        // task does. `version` makes the write lose to a concurrent update rather than clobber it.
        { ...rawRule, uiamApiKey: Buffer.from(`${result.id}:${result.key}`).toString('base64') },
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
    // Includes the 409 from another worker having re-granted the key first, which needs no handling
    // of its own: that worker's key is live and this rule's next run will use it.
    logger.warn(`Failed to re-grant the UIAM API key for the rule: ${error.message}`, {
      tags: logTags,
    });
  }
};
