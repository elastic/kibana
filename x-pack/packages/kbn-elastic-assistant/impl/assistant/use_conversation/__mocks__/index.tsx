/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useConversation = () => ({
  appendMessage: jest.fn(),
  appendReplacements: jest.fn(),
  clearConversation: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  setApiConfig: jest.fn(),
  setConversation: jest.fn(),
});
