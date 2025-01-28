/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { ComponentType } from 'react';
import { ObservabilityAIAssistantChatServiceContext } from '../context/observability_ai_assistant_chat_service_context';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
import { createStorybookService, createStorybookChatService } from '../storybook_mock';

const mockService = createStorybookService();
const mockChatService = createStorybookChatService();

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  return (
    <KibanaContextProvider>
      <ObservabilityAIAssistantProvider value={mockService}>
        <ObservabilityAIAssistantChatServiceContext.Provider value={mockChatService}>
          <Story />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      </ObservabilityAIAssistantProvider>
    </KibanaContextProvider>
  );
}
