/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ContentBlockDeltaEvent,
  ContentBlockStartEvent,
  ContentBlockStopEvent,
  ConverseStreamMetadataEvent,
  MessageStartEvent,
  MessageStopEvent,
} from '@aws-sdk/client-bedrock-runtime';
import type { MessageHeaders } from '@smithy/types';

export interface ConverseCompletionChunk {
  type:
    | 'contentBlockStart'
    | 'contentBlockDelta'
    | 'messageDelta'
    | 'metadata'
    | 'messageStart'
    | 'messageStop';
  body: ConverseResponse;
}

export type ConverseResponse =
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageStartEvent
  | MessageStopEvent
  | ConverseStreamMetadataEvent;

export interface ConverseBedrockChunkMember {
  headers: MessageHeaders;
  body: ConverseResponse;
}
