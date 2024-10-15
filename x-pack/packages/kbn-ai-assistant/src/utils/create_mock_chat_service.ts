/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import {
  FunctionDefinition,
  MessageRole,
  ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import { BehaviorSubject } from 'rxjs';

type MockedChatService = DeeplyMockedKeys<ObservabilityAIAssistantChatService>;

export const createMockChatService = (): MockedChatService => {
  const mockChatService: MockedChatService = {
    chat: jest.fn(),
    complete: jest.fn(),
    sendAnalyticsEvent: jest.fn(),
    functions$: new BehaviorSubject<FunctionDefinition[]>([]) as MockedChatService['functions$'],
    getFunctions: jest.fn().mockReturnValue([]),
    hasFunction: jest.fn().mockReturnValue(false),
    hasRenderFunction: jest.fn().mockReturnValue(true),
    renderFunction: jest.fn(),
    getSystemMessage: jest.fn().mockReturnValue({
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.System,
        content: '',
      },
    }),
    getScope: jest.fn(),
  };
  return mockChatService;
};
