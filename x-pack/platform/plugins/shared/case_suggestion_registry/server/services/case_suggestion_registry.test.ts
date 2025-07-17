/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolDefinition } from '@kbn/inference-common';
import { Registry, SuggestionDefinitionServer } from './case_suggestion_registry';

describe('CaseSuggestionRegistry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  const mockTool: ToolDefinition = {
    name: 'mockTool',
    description: 'A mock tool',
  };

  const mockHandler = async () => ({
    payload: { data: 'mockData' },
    metadata: { info: 'mockInfo' },
  });

  const mockSuggestion: SuggestionDefinitionServer = {
    suggestionId: 'mockSuggestion',
    displayName: 'Mock Suggestion',
    description: 'A mock suggestion for testing',
    availableTools: { mockTool },
    toolHandlers: { mockHandler },
  };

  it('registers a suggestion successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.get('mockSuggestion')).toEqual(mockSuggestion);
  });

  it('throws an error when registering a duplicate suggestion', () => {
    registry.register(mockSuggestion);
    expect(() => registry.register(mockSuggestion)).toThrow(
      "Suggestion type 'mockSuggestion' is already registered."
    );
  });

  it('retrieves a tool successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.getTool('mockTool')).toEqual(mockTool);
  });

  it('throws an error when registering a duplicate tool', () => {
    registry.register(mockSuggestion);
    const duplicateSuggestion = {
      ...mockSuggestion,
      suggestionId: 'duplicateSuggestion',
    };
    expect(() => registry.register(duplicateSuggestion)).toThrow(
      "Tool 'mockTool' is already registered for suggestion type 'duplicateSuggestion'."
    );
  });

  it('retrieves a tool handler successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.getToolHandler('mockHandler')).toBe(mockHandler);
  });

  it('throws an error when registering a duplicate tool handler', () => {
    registry.register(mockSuggestion);
    const duplicateSuggestion = {
      ...mockSuggestion,
      suggestionId: 'duplicateSuggestion',
    };
    expect(() => registry.register(duplicateSuggestion)).toThrow(
      "Tool handler 'mockHandler' is already registered for suggestion type 'duplicateSuggestion'."
    );
  });

  it('retrieves all tools successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.getAllTools()).toEqual({ mockTool });
  });

  it('retrieves all tool handlers successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.getAllToolHandlers()).toEqual({ mockHandler });
  });

  it('retrieves all suggestions successfully', () => {
    registry.register(mockSuggestion);
    expect(registry.getAll()).toEqual([mockSuggestion]);
  });
});
