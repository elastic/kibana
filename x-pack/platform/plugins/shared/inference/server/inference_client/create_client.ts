/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { BoundOptions, BoundInferenceClient, InferenceClient } from '@kbn/inference-common';
import { AnonymizationRule } from '@kbn/inference-common';
import { ElasticsearchClient } from '@kbn/core/server';
import { createInferenceClient } from './inference_client';
import { bindClient } from '../../common/inference_client/bind_client';

interface CreateClientOptions {
  request: KibanaRequest;
  actions: ActionsPluginStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  esClient: ElasticsearchClient;
}

interface BoundCreateClientOptions extends CreateClientOptions {
  bindTo: BoundOptions;
}

export function createClient(options: CreateClientOptions): InferenceClient;
export function createClient(options: BoundCreateClientOptions): BoundInferenceClient;
export function createClient(
  options: CreateClientOptions | BoundCreateClientOptions
): BoundInferenceClient | InferenceClient {
  const { actions, request, logger, anonymizationRulesPromise, esClient } = options;
  const client = createInferenceClient({
    request,
    actions,
    logger: logger.get('client'),
    anonymizationRulesPromise,
    esClient,
  });
  if ('bindTo' in options) {
    return bindClient(client, options.bindTo);
  } else {
    return client;
  }
}
