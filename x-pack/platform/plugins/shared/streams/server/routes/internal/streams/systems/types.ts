/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { System } from '@kbn/streams-schema';

export type IdentifiedSystemsEvent = ServerSentEventBase<
  'identified_systems',
  { systems: System[] }
>;

export type StreamDescriptionEvent = ServerSentEventBase<
  'stream_description',
  { description: string }
>;
