/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { ServerSentEventBase } from '@kbn/sse-utils';

export type StreamDescriptionEvent = ServerSentEventBase<
  'stream_description',
  { description: string; tokensUsed: ChatCompletionTokenCount }
>;
