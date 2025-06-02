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
  BoundChatCompleteOptions,
  BoundInferenceClient,
  InferenceClient,
} from '@kbn/inference-common';
import { createInferenceClient } from './inference_client';
import { bindClient } from '../../common/inference_client/bind_client';

interface UnboundOptions {
  request: KibanaRequest;
  actions: ActionsPluginStart;
  logger: Logger;
}

interface BoundOptions extends UnboundOptions {
  bindTo: BoundChatCompleteOptions;
}

export function createClient(options: UnboundOptions): InferenceClient;
export function createClient(options: BoundOptions): BoundInferenceClient;
export function createClient(
  options: UnboundOptions | BoundOptions
): BoundInferenceClient | InferenceClient {
  const { actions, request, logger } = options;
  const client = createInferenceClient({ request, actions, logger: logger.get('client') });
  if ('bindTo' in options) {
    return bindClient(client, options.bindTo);
  } else {
    return client;
  }
}
