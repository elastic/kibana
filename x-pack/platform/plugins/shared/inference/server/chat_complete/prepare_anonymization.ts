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
    await ensureReplacementsIndex({ esClient: replacementsClient, logger });
    repo = new ReplacementsRepository(replacementsClient, {
      encryptionKey,
    });
  }

  let existingReplacements = carriedReplacementsId
    ? await repo?.get(namespace, carriedReplacementsId)
    : null;
  if (carriedReplacementsId && !existingReplacements) {
    // Recover by allocating a new doc ID when caller carries a stale/unknown one.
    replacementsId = uuidv4();
  }

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
    await ensureReplacementsIndex({ esClient: replacementsClient, logger });
    repo = new ReplacementsRepository(replacementsClient, {
      encryptionKey,
    });
  }

  if (existingReplacements) {
    try {
      const updated = await repo.update(namespace, replacementsId, { replacements });
      if (!updated) {
        replacementsId = uuidv4();
        existingReplacements = null;
      }
    } catch (updateErr) {
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
    await repo.create({
      id: replacementsId,
      namespace,
      createdBy: 'inference',
      replacements,
    });
  }

  return { anonymization, replacementsId, effectivePolicy };
};
