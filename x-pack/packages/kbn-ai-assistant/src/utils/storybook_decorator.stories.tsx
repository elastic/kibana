/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { ComponentType } from 'react';
import {
  createStorybookChatService,
  createStorybookService,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import { Subject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { AIAssistantAppService } from '../service/create_app_service';

const mockService: AIAssistantAppService = {
  ...createStorybookService(),
};

const mockChatService: ObservabilityAIAssistantChatService = createStorybookChatService();

const coreStart = coreMock.createStart();

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const ObservabilityAIAssistantChatServiceContext = React.createContext(mockChatService);
  const ObservabilityAIAssistantMultipaneFlyoutContext = React.createContext({
    container: <div />,
    setVisibility: () => false,
  });

  return (
    <KibanaContextProvider
      services={{
        ...coreStart,
        licensing: {
          license$: new Subject(),
        },
        observabilityAIAssistant: {
          ObservabilityAIAssistantChatServiceContext,
          ObservabilityAIAssistantMultipaneFlyoutContext,
          service: mockService,
        },
        triggersActionsUi: { getAddRuleFlyout: {}, getAddConnectorFlyout: {} },
      }}
    >
      <ObservabilityAIAssistantChatServiceContext.Provider value={mockChatService}>
        <Story />
      </ObservabilityAIAssistantChatServiceContext.Provider>
    </KibanaContextProvider>
  );
}
