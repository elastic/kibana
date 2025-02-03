/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type {
  ChatActionClickHandler,
  Message,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useAIAssistantChatService } from './hooks';
interface Props {
  name: string;
  arguments: string | undefined;
  response: Message['message'];
  onActionClick: ChatActionClickHandler;
}

export function RenderFunction(props: Props) {
  const chatService = useAIAssistantChatService();
  return (
    <>
      {chatService.renderFunction(props.name, props.arguments, props.response, props.onActionClick)}
    </>
  );
}
