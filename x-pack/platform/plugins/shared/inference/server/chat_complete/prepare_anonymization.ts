/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AnonymizationRule,
  ChatCompleteAnonymizationTarget,
  ChatCompleteOptions,
} from '@kbn/inference-common';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import { anonymizeMessages } from './anonymization/anonymize_messages';
import type { RegexWorkerService } from './anonymization/regex_worker_service';
import { ReplacementsRepository } from './anonymization/replacements/replacements_repository';
import { ensureReplacementsIndex } from './anonymization/replacements/replacements_index';
import { isConflictError, isRetryableShardRecoveryError, withShardRecoveryRetry } from './utils';

interface PrepareAnonymizationOptions {
  namespace: string;
  logger: Logger;
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  replacementsEsClient?: ElasticsearchClient;
  replacementsEncryptionKeyPromise?: Promise<string | undefined>;
  usePersistentReplacements?: boolean;
  requireReplacementsEncryptionKey?: boolean;
  saltPromise?: Promise<string | undefined>;
  resolveEffectivePolicy?: (
    target?: ChatCompleteAnonymizationTarget
  ) => Promise<EffectivePolicy | undefined>;
  metadata?: ChatCompleteOptions['metadata'];
  system?: ChatCompleteOptions['system'];
  messages: ChatCompleteOptions['messages'];
}

export const prepareAnonymization = async ({
  namespace,
  logger,
  anonymizationRules,
  regexWorker,
  esClient,
  replacementsEsClient,
  replacementsEncryptionKeyPromise,
  usePersistentReplacements = true,
  requireReplacementsEncryptionKey = false,
  saltPromise,
  resolveEffectivePolicy,
  metadata,
  system,
  messages,
}: PrepareAnonymizationOptions) => {
  const salt = await saltPromise;
  const effectivePolicy = await resolveEffectivePolicy?.(metadata?.anonymization?.target);
  if (!usePersistentReplacements) {
    const anonymization = await anonymizeMessages({
      system,
      messages,
      anonymizationRules,
      regexWorker,
      esClient,
      salt: salt ?? undefined,
      effectivePolicy,
    });
    return { anonymization, replacementsId: undefined, effectivePolicy };
  }

  const carriedReplacementsId = metadata?.anonymization?.replacementsId;
  const replacementsClient = replacementsEsClient ?? esClient;
  let repo: ReplacementsRepository | undefined;
  let replacementsId = carriedReplacementsId;
  let resolvedReplacementsEncryptionKey: string | undefined;

  const getReplacementsEncryptionKey = async (): Promise<string | undefined> => {
    if (resolvedReplacementsEncryptionKey) {
      return resolvedReplacementsEncryptionKey;
    }
    resolvedReplacementsEncryptionKey = await replacementsEncryptionKeyPromise;
    return resolvedReplacementsEncryptionKey;
  };

  if (carriedReplacementsId) {
    const encryptionKey = await getReplacementsEncryptionKey();
    if (requireReplacementsEncryptionKey && !encryptionKey) {
      throw createInferenceRequestError(
        'Replacements encryption key is not available — verify the anonymization plugin is active and properly initialized',
        400
      );
    }
    await withShardRecoveryRetry({
      logger,
      operation: 'ensure_replacements_index',
      action: () => ensureReplacementsIndex({ esClient: replacementsClient, logger }),
    });
    repo = new ReplacementsRepository(replacementsClient, {
      encryptionKey,
    });
  }

  let existingReplacements = carriedReplacementsId
    ? await withShardRecoveryRetry({
        logger,
        operation: 'get_replacements',
        action: async () => repo?.get(namespace, carriedReplacementsId),
      })
    : null;

  const anonymization = await anonymizeMessages({
    system,
    messages,
    anonymizationRules,
    regexWorker,
    esClient,
    salt: salt ?? undefined,
    effectivePolicy,
    knownReplacements: (existingReplacements?.replacements ?? []).filter(
      (r): r is { anonymized: string; original: string } =>
        typeof r.anonymized === 'string' && typeof r.original === 'string'
    ),
  });

  const replacements = anonymization.anonymizations.map(({ entity }) => ({
    anonymized: entity.mask,
    original: entity.value,
  }));
  const shouldPersistReplacements = Boolean(carriedReplacementsId || replacements.length);

  if (!shouldPersistReplacements) {
    return { anonymization, replacementsId: undefined, effectivePolicy };
  }

  const encryptionKey = await getReplacementsEncryptionKey();
  if (requireReplacementsEncryptionKey && !encryptionKey) {
    throw createInferenceRequestError(
      'Replacements encryption key is not available — verify the anonymization plugin is active and properly initialized',
      400
    );
  }

  replacementsId ??= uuidv4();

  if (!repo) {
    await withShardRecoveryRetry({
      logger,
      operation: 'ensure_replacements_index',
      action: () => ensureReplacementsIndex({ esClient: replacementsClient, logger }),
    });
    repo = new ReplacementsRepository(replacementsClient, {
      encryptionKey,
    });
  }

  if (existingReplacements) {
    try {
      if (!replacementsId) {
        throw new Error(
          'Invariant violation: existing replacements found without a replacementsId'
        );
      }
      const replacementsIdForUpdate = replacementsId;
      const updated = await withShardRecoveryRetry({
        logger,
        operation: 'update_replacements',
        action: () => repo.update(namespace, replacementsIdForUpdate, { replacements }),
      });
      if (!updated) {
        replacementsId = uuidv4();
        existingReplacements = null;
      }
    } catch (updateErr) {
      if (isRetryableShardRecoveryError(updateErr)) {
        throw updateErr;
      }
      logger.warn(
        `Replacements update failed for ${replacementsId}, creating new document: ${
          updateErr instanceof Error ? updateErr.message : String(updateErr)
        }`
      );
      replacementsId = uuidv4();
      existingReplacements = null;
    }
  }

  if (!existingReplacements) {
    try {
      await withShardRecoveryRetry({
        logger,
        operation: 'create_replacements',
        action: () =>
          repo.create({
            id: replacementsId,
            namespace,
            createdBy: 'inference',
            replacements,
          }),
      });
    } catch (createErr) {
      // Another concurrent request may have created this replacements document first.
      if (!isConflictError(createErr)) {
        throw createErr;
      }
      await withShardRecoveryRetry({
        logger,
        operation: 'update_replacements_after_conflict',
        action: () => repo.update(namespace, replacementsId, { replacements }),
      });
    }
  }

  return { anonymization, replacementsId, effectivePolicy };
};
