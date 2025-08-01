/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, isBaseMessage } from '@langchain/core/messages';

export interface ReasoningStep {
  type: 'reasoning';
  reasoning: string;
}

export const isReasoningStep = (entry: ReasoningStep | BaseMessage): entry is ReasoningStep => {
  return 'type' in entry && entry.type === 'reasoning';
};

export const isMessage = (entry: ReasoningStep | BaseMessage): entry is BaseMessage => {
  return isBaseMessage(entry);
};

export type AddedMessage = ReasoningStep | BaseMessage;
