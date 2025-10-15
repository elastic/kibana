/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import type { EvaluatorId } from '../../../common/http_api/evaluations';

export interface EvaluatorContext {
  conversation: Conversation;
  currentRound: ConversationRound;
  customInstructions: string | number;
}

export type EvaluatorFunction = (context: EvaluatorContext) => Promise<number>;

export type EvaluatorRegistry = Record<EvaluatorId, EvaluatorFunction>;
