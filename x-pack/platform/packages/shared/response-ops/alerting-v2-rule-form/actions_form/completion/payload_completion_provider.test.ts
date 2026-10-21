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

const getSuggestionLabels = (textUpToCursor: string): string[] => {
  const model = { getLineContent: () => textUpToCursor };
  const position = { lineNumber: 1, column: textUpToCursor.length + 1 } as monaco.Position;
  const { suggestions } = createPayloadCompletionProvider().provideCompletionItems(
    model as unknown as monaco.editor.ITextModel,
    position,
    {} as monaco.languages.CompletionContext,
    {} as monaco.CancellationToken
  ) as monaco.languages.CompletionList;
  return suggestions.map(({ label }) => (typeof label === 'string' ? label : label.label));
};

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
});
