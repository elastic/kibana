/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, InferenceClient } from '@kbn/inference-common';
import type { BoundOptions } from '@kbn/inference-common';
import { bindChatComplete } from '../chat_complete';
import { bindPrompt } from '../prompt';
import { bindOutput } from '../output';

/**
 * Parameters a client can be bound to. The server-side client can bind a `featureId` in place of
 * the `connectorId`; the shared {@link BoundOptions} type used by the browser client stays connector-only.
 */
export type BindClientOptions = Omit<BoundOptions, 'connectorId'> &
  ({ connectorId: string; featureId?: never } | { featureId: string; connectorId?: never });

export const bindClient = (
  unboundClient: InferenceClient,
  boundParams: BindClientOptions
): BoundInferenceClient => {
  // the `bind*` helpers are typed with the shared `BoundOptions`; `bindApi` forwards `featureId` at runtime
  const params = boundParams as BoundOptions;
  return {
    ...unboundClient,
    chatComplete: bindChatComplete(unboundClient.chatComplete, params),
    prompt: bindPrompt(unboundClient.prompt, params),
    output: bindOutput(unboundClient.output, params),
  };
};
