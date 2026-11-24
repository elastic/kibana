/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import { createReasonCompletionProvider } from './reason_completion_provider';

jest.mock('@kbn/code-editor', () => ({
  monaco: { languages: { CompletionItemKind: { Variable: 4 } } },
}));

const VARIABLES = [
  { expression: 'data.host.name', detail: 'keyword' },
  { expression: 'rule.name', detail: 'Rule name' },
];

const ownModel = { getLineContent: jest.fn() } as unknown as monaco.editor.ITextModel;

const getSuggestions = (
  textUpToCursor: string,
  model: monaco.editor.ITextModel = ownModel
): monaco.languages.CompletionItem[] => {
  (ownModel.getLineContent as jest.Mock).mockReturnValue(textUpToCursor);
  const position = { lineNumber: 1, column: textUpToCursor.length + 1 } as monaco.Position;
  const provider = createReasonCompletionProvider({
    getVariables: () => VARIABLES,
    getModel: () => ownModel,
  });
  const result = provider.provideCompletionItems(
    model,
    position,
    {} as monaco.languages.CompletionContext,
    {} as monaco.CancellationToken
  ) as monaco.languages.CompletionList;
  return result.suggestions;
};

const labels = (suggestions: monaco.languages.CompletionItem[]) =>
  suggestions.map(({ label }) => (typeof label === 'string' ? label : label.label));

describe('createReasonCompletionProvider', () => {
  it('suggests every variable right after the opening braces', () => {
    expect(labels(getSuggestions('CPU on {{'))).toEqual(['data.host.name', 'rule.name']);
    expect(labels(getSuggestions('CPU on {{ '))).toEqual(['data.host.name', 'rule.name']);
  });

  it('replaces the word being typed', () => {
    const [suggestion] = getSuggestions('CPU on {{ data.ho');

    expect(suggestion.range).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 11,
      endColumn: 18,
    });
  });

  it('carries the detail of each variable', () => {
    expect(getSuggestions('{{ ').map(({ detail }) => detail)).toEqual(['keyword', 'Rule name']);
  });

  it('suggests nothing outside an expression', () => {
    expect(getSuggestions('CPU on ')).toEqual([]);
    expect(getSuggestions('{{ data.cpu }} and ')).toEqual([]);
  });

  it('suggests nothing for a model of another editor', () => {
    const otherModel = { getLineContent: jest.fn() } as unknown as monaco.editor.ITextModel;

    expect(getSuggestions('{{ ', otherModel)).toEqual([]);
  });
});
