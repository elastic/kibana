/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasUserMessages } from './type_guards';

describe('apiHasUserMessages', () => {
  const message = {
    uniqueId: 'msg-1',
    severity: 'info',
    shortMessage: 'Test message',
    longMessage: () => 'Test message',
    fixableInEditor: false,
    displayLocations: [{ id: 'embeddableBadge' }],
  };

  const validCases = [
    {
      input: { userMessages: [message] },
      label: 'array with one message',
    },
    { input: { userMessages: [message, message] }, label: 'array with multiple messages' },
    { input: { userMessages: [] }, label: 'empty array' },
  ];

  const invalidCases = [
    { input: null, label: 'null' },
    { input: undefined, label: 'undefined' },
    {
      input: { onLoad: jest.fn(), onBeforeBadgesRender: jest.fn() },
      label: 'object without userMessages property',
    },
    { input: 0, label: 'number primitive' },
    { input: '', label: 'string primitive' },
  ];

  it.each(validCases)('returns true for $label', ({ input }) => {
    expect(apiHasUserMessages(input)).toBe(true);
  });

  it.each(invalidCases)('returns false for $label', ({ input }) => {
    expect(apiHasUserMessages(input)).toBe(false);
  });
});
