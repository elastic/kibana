/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationSourceInputMessage,
  ConversationSourceOutputMessage,
  ConversationSourceType,
  ConversationRound,
  RoundInput,
} from '@kbn/agent-builder-common';

/** Transforms messages between an external source (e.g. Slack) and the internal conversation model. */
export interface ConversationSourceAdapter<
  T extends ConversationSourceType = ConversationSourceType
> {
  /** Normalize the raw source input (e.g. a Slack conversation source message) into the internal round input. */
  toRoundInput(input: ConversationSourceInputMessage): RoundInput;

  /** Source-specific structured output schema for the final response. */
  getOutputSchema(): Record<string, unknown> | undefined;

  /** Compose the source-specific callback payload from a completed round. */
  toSourcePayload(round: ConversationRound): ConversationSourceOutputMessage;
}
