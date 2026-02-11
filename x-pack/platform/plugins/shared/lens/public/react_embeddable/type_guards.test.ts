/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserMessage } from '@kbn/lens-common';
import { apiHasUserMessages } from './type_guards';

function createUserMessage(uniqueId: string): UserMessage {
  return {
    uniqueId,
    severity: 'info',
    shortMessage: 'Test message',
    longMessage: () => 'Test message',
    fixableInEditor: false,
    displayLocations: [{ id: 'embeddableBadge' }],
  };
}

describe('apiHasUserMessages', () => {
  it('should return true when api has userMessages property with array', () => {
    const messages: UserMessage[] = [createUserMessage('msg-1')];
    const api = { userMessages: messages };
    expect(apiHasUserMessages(api)).toBe(true);
    expect(api.userMessages).toBe(messages);
  });

  it('should return true when api has userMessages property set to empty array', () => {
    const api = { userMessages: [] };
    expect(apiHasUserMessages(api)).toBe(true);
    expect(api.userMessages).toEqual([]);
  });

  it('should return false when api is null', () => {
    expect(apiHasUserMessages(null)).toBe(false);
  });

  it('should return false when api is undefined', () => {
    expect(apiHasUserMessages(undefined)).toBe(false);
  });

  it('should return false when api does not have userMessages property', () => {
    const api = { onLoad: jest.fn(), onBeforeBadgesRender: jest.fn() };
    expect(apiHasUserMessages(api)).toBe(false);
  });

  it('should return false when api is a primitive', () => {
    expect(apiHasUserMessages(0)).toBe(false);
    expect(apiHasUserMessages('')).toBe(false);
  });
});
