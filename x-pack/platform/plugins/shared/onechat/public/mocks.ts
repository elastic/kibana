/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup, OnechatPluginStart, ConversationFlyoutRef } from './types';
import type { OpenConversationFlyoutOptions } from './flyout/types';

const createSetupContractMock = (): jest.Mocked<OnechatPluginSetup> => {
  return {};
};

const createStartContractMock = (): jest.Mocked<OnechatPluginStart> => {
  return {
    tools: {} as any,
    setConversationFlyoutActiveConfig: jest.fn(),
    clearConversationFlyoutActiveConfig: jest.fn(),
    openConversationFlyout: jest
      .fn()
      .mockImplementation((options: OpenConversationFlyoutOptions) => {
        const mockFlyoutRef: ConversationFlyoutRef = {
          close: jest.fn(),
        };
        return {
          flyoutRef: mockFlyoutRef,
        };
      }),
  };
};

export const onechatMocks = {
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
};
