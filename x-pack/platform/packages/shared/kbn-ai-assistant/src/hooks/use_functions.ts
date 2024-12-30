/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useObservable } from 'react-use/lib';
import { useAIAssistantChatService } from './use_ai_assistant_chat_service';

export const useFunctions = () => {
  const service = useAIAssistantChatService();
  const functions = useObservable(service.functions$);
  return functions || [];
};
