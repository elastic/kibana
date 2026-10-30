/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import { createPayloadCompletionProvider } from './payload_completion_provider';

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    languages: {
      CompletionItemKind: {
        Variable: 4,
      },
    },
  },
}));

const getSuggestions = (textUpToCursor: string): monaco.languages.CompletionItem[] => {
  const model = { getLineContent: () => textUpToCursor };
  const position = { lineNumber: 1, column: textUpToCursor.length + 1 } as monaco.Position;
  const { suggestions } = createPayloadCompletionProvider().provideCompletionItems(
    model as unknown as monaco.editor.ITextModel,
    position,
    {} as monaco.languages.CompletionContext,
    {} as monaco.CancellationToken
  ) as monaco.languages.CompletionList;
  return suggestions;
};

const getSuggestionLabels = (textUpToCursor: string): string[] =>
  getSuggestions(textUpToCursor).map(({ label }) =>
    typeof label === 'string' ? label : label.label
  );

const cursorRange = (startColumn: number, endColumn: number): monaco.IRange => ({
  startLineNumber: 1,
  endLineNumber: 1,
  startColumn,
  endColumn,
});

describe('createPayloadCompletionProvider', () => {
  it('suggests the dispatcher payload fields under inputs.payload', () => {
    expect(getSuggestionLabels('message: "{{ inputs.payload.')).toEqual([
      'id',
      'policyId',
      'groupKey',
      'alerts',
      'rules',
    ]);
  });

  it('suggests alert fields inside an inputs.payload.alerts item', () => {
    const labels = getSuggestionLabels('message: "{{ inputs.payload.alerts[0].');

    expect(labels).toEqual(expect.arrayContaining(['alert_id', 'alert_status', 'rule_id', 'data']));
    expect(labels).not.toContain('episode_id');
    expect(labels).not.toContain('episode_status');
  });

  it('does not suggest alert fields under the removed inputs.payload.episodes path', () => {
    expect(getSuggestionLabels('message: "{{ inputs.payload.episodes[0].')).toEqual([]);
  });

  it('suggests the trigger inputs under inputs', () => {
    expect(getSuggestionLabels('message: "{{ inputs.')).toEqual(['payload']);
  });

  it('suggests payload fields with their full path before any path is typed', () => {
    expect(getSuggestionLabels('message: "{{ ')).toEqual([
      'inputs.payload.id',
      'inputs.payload.policyId',
      'inputs.payload.groupKey',
      'inputs.payload.alerts',
      'inputs.payload.rules',
    ]);
  });

  it('does not suggest alert fields below an alert field', () => {
    expect(getSuggestionLabels('message: "{{ inputs.payload.alerts[0].data.')).toEqual([]);
  });

  it('builds each suggestion from the schema type and description', () => {
    const text = 'message: "{{ inputs.payload.alerts[0].';
    const severity = getSuggestions(text).find(({ label }) => label === 'severity');

    expect(severity).toEqual({
      label: 'severity',
      kind: 4,
      detail: "'info' | 'low' | 'medium' | 'high' | 'critical'",
      documentation: 'Severity of the alert (optional)',
      insertText: 'severity',
      range: cursorRange(text.length + 1, text.length + 1),
    });
  });

  it('inserts the full path for suggestions offered before any path is typed', () => {
    const text = 'message: "{{ ';
    const [first] = getSuggestions(text);

    expect(first).toEqual(
      expect.objectContaining({
        label: 'inputs.payload.id',
        insertText: 'inputs.payload.id',
        range: cursorRange(text.length + 1, text.length + 1),
      })
    );
  });

  it('replaces the partially typed segment', () => {
    const text = 'message: "{{ inputs.payload.pol';
    const suggestions = getSuggestions(text);

    expect(suggestions.map(({ label }) => label)).toContain('policyId');
    expect(suggestions.map(({ range }) => range)).toEqual(
      suggestions.map(() => cursorRange(text.length - 2, text.length + 1))
    );
  });

  it.each([
    ['the rule id lookup used by the default templates', 'inputs.payload.rules[alert.rule_id].'],
    ['a literal rule id', 'inputs.payload.rules.rule1.'],
  ])('suggests rule fields under %s', (_, path) => {
    expect(getSuggestionLabels(`message: "{{ ${path}`)).toEqual(['name']);
  });

  it('suggests children of the path before an @ trigger', () => {
    expect(getSuggestionLabels('message: "{{ inputs.@')).toEqual(['payload']);
  });

  it.each([
    ['outside a template', 'message: hello'],
    ['after a Liquid filter pipe', 'message: "{{ inputs.payload.id | '],
  ])('does not suggest variables %s', (_, text) => {
    expect(getSuggestions(text)).toEqual([]);
  });
});
