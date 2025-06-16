/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, InferenceClient } from '@kbn/inference-common';
import { BoundOptions } from '@kbn/inference-common';
import { bindChatComplete } from '../chat_complete';
import { bindPrompt } from '../prompt';
import { bindOutput } from '../output';

export const bindClient = (
  unboundClient: InferenceClient,
  boundParams: BoundOptions
): BoundInferenceClient => {
  return {
    ...unboundClient,
    chatComplete: bindChatComplete(unboundClient.chatComplete, boundParams),
    prompt: bindPrompt(unboundClient.prompt, boundParams),
    output: bindOutput(unboundClient.output, boundParams),
  };
};
