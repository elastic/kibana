/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOneChatContext } from './utils';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

describe('getOneChatContext', () => {
  it('should extract context from config.configurable.onechat', () => {
    const mockContext: Omit<ToolHandlerContext, 'resultStore'> = {
      request: {} as any,
      spaceId: 'default',
      logger: {} as any,
      esClient: {} as any,
      modelProvider: {} as any,
      toolProvider: {} as any,
      runner: {} as any,
      events: {} as any,
    };

    const config = {
      configurable: {
        onechat: mockContext,
      },
    };

    const result = getOneChatContext(config);
    expect(result).toEqual(mockContext);
  });

  it('should return null when context is not available', () => {
    const config = {};
    const result = getOneChatContext(config);
    expect(result).toBeNull();
  });

  it('should return null when configurable is missing', () => {
    const config = { someOtherProperty: 'value' };
    const result = getOneChatContext(config);
    expect(result).toBeNull();
  });

  it('should return null when onechat is missing from configurable', () => {
    const config = {
      configurable: {
        otherService: {},
      },
    };
    const result = getOneChatContext(config);
    expect(result).toBeNull();
  });
});





