/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { Conversation } from '../../../assistant_context/types';
import { Prompt } from '../../types';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';

interface Props {
  allSystemPrompts: Prompt[];
  conversation: Conversation;
}

export const SystemPromptColumn: React.FC<Props> = ({ allSystemPrompts, conversation }) => {
  const systemPrompt: Prompt | undefined = allSystemPrompts.find(
    ({ id }) => id === conversation.apiConfig?.defaultSystemPromptId
  );

  const defaultSystemPrompt = getDefaultSystemPrompt({
    allSystemPrompts,
    conversation,
  });

  const systemPromptTitle =
    systemPrompt?.label ||
    systemPrompt?.name ||
    defaultSystemPrompt?.label ||
    defaultSystemPrompt?.name;

  return systemPromptTitle ? <EuiBadge color="hollow">{systemPromptTitle}</EuiBadge> : null;
};

SystemPromptColumn.displayName = 'SystemPromptColumn';
