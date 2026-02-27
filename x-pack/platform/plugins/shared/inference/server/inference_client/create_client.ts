/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type {
  BoundOptions,
  BoundInferenceClient,
  InferenceClient,
  AnonymizationRule,
  ChatCompleteAnonymizationTarget,
  InferenceCallbacks,
} from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import { createInferenceClient } from './inference_client';
import { bindClient } from '../../common/inference_client/bind_client';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';

interface CreateClientOptions {
  request: KibanaRequest;
  namespace?: string;
  actions: ActionsPluginStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  replacementsEsClient?: ElasticsearchClient;
  callbacks?: InferenceCallbacks;
  /** Promise resolving per-space salt for deterministic tokenization. */
  saltPromise?: Promise<string | undefined>;
  resolveEffectivePolicy?: (
    target?: ChatCompleteAnonymizationTarget
  ) => Promise<EffectivePolicy | undefined>;
  replacementsEncryptionKey?: string;
  usePersistentReplacements?: boolean;
}

interface BoundCreateClientOptions extends CreateClientOptions {
  bindTo: BoundOptions;
}

export function createClient(options: CreateClientOptions): InferenceClient;
export function createClient(options: BoundCreateClientOptions): BoundInferenceClient;
export function createClient(
  options: CreateClientOptions | BoundCreateClientOptions
): BoundInferenceClient | InferenceClient {
  const {
    actions,
    request,
    namespace,
    logger,
    anonymizationRulesPromise,
    esClient,
    regexWorker,
    callbacks,
    saltPromise,
    resolveEffectivePolicy,
    replacementsEsClient,
    replacementsEncryptionKey,
    usePersistentReplacements,
  } = options;
  const client = createInferenceClient({
    request,
    namespace: namespace ?? 'default',
    actions,
    logger: logger.get('client'),
    anonymizationRulesPromise,
    regexWorker,
    esClient,
    replacementsEsClient,
    callbacks,
    saltPromise,
    resolveEffectivePolicy,
    replacementsEncryptionKey,
    usePersistentReplacements,
  });
  if ('bindTo' in options) {
    return bindClient(client, options.bindTo);
  } else {
    return client;
  }
}
