/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const generateTitleMock$ = jest.fn();
export const getChatModelMock$ = jest.fn();
export const executeAgentMock$ = jest.fn();
export const getConversationMock$ = jest.fn();
export const conversationExistsMock$ = jest.fn();
export const updateConversationMock$ = jest.fn();
export const createConversationMock$ = jest.fn();
export const resolveSelectedConnectorIdMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    generateTitle$: generateTitleMock$,
    getChatModel$: getChatModelMock$,
    executeAgent$: executeAgentMock$,
    getConversation$: getConversationMock$,
    conversationExists$: conversationExistsMock$,
    updateConversation$: updateConversationMock$,
    createConversation$: createConversationMock$,
  };
});

jest.doMock('./utils/resolve_selected_connector_id', () => {
  return {
    resolveSelectedConnectorId: resolveSelectedConnectorIdMock,
  };
});
