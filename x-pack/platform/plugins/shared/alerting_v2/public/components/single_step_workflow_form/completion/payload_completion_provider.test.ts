/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    languages: {
      CompletionItemKind: { Variable: 4 },
    },
  },
}));

import { createPayloadCompletionProvider } from './payload_completion_provider';
import { DISPATCH_PAYLOAD_VARIABLES, ALERT_EPISODE_FIELDS } from '../registry';

const makeModel = (lineContent: string) => ({
  getLineContent: () => lineContent,
});

const makePosition = (column: number) => ({
  lineNumber: 1,
  column,
});

describe('createPayloadCompletionProvider', () => {
  const provider = createPayloadCompletionProvider();

  it('returns inputs.-prefixed variables at top level inside an empty template', () => {
    const line = '{{ ';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: Array<{ label: string; insertText: string }> };

    expect(result.suggestions).toHaveLength(DISPATCH_PAYLOAD_VARIABLES.length);
    expect(result.suggestions.map((s) => s.label)).toEqual(
      DISPATCH_PAYLOAD_VARIABLES.map((v) => `inputs.${v.path}`)
    );
    // insertText must match the label so accepting a suggestion doesn't double the prefix
    expect(result.suggestions.map((s) => s.insertText)).toEqual(
      DISPATCH_PAYLOAD_VARIABLES.map((v) => `inputs.${v.path}`)
    );
  });

  it('returns bare inputs children inside {{ inputs.', () => {
    const line = '{{ inputs.';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: Array<{ label: string }> };

    expect(result.suggestions).toHaveLength(DISPATCH_PAYLOAD_VARIABLES.length);
    expect(result.suggestions.map((s) => s.label)).toEqual(
      DISPATCH_PAYLOAD_VARIABLES.map((v) => v.path)
    );
  });

  it('returns episode fields when cursor is inside inputs.episodes[N].', () => {
    const line = 'to: "{{ inputs.episodes[0].';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: Array<{ label: string }> };

    expect(result.suggestions).toHaveLength(ALERT_EPISODE_FIELDS.length);
    expect(result.suggestions.map((s) => s.label)).toEqual(ALERT_EPISODE_FIELDS.map((v) => v.path));
  });

  it('returns no suggestions outside a Liquid template', () => {
    const line = 'not a template';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: unknown[] };

    expect(result.suggestions).toHaveLength(0);
  });

  it('returns no suggestions for an unknown nested path', () => {
    const line = '{{ foo.bar.';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: unknown[] };

    expect(result.suggestions).toHaveLength(0);
  });

  it('returns bare inputs children for the second template on the same line', () => {
    const line = '{{ inputs.id }} text {{ inputs.poli';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: Array<{ label: string }> };

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.map((s) => s.label)).toContain('policyId');
  });

  it('returns no suggestions inside a Liquid filter context', () => {
    const line = '{{ inputs.id | upc';
    const result = provider.provideCompletionItems!(
      makeModel(line) as any,
      makePosition(line.length + 1) as any,
      {} as any,
      {} as any
    ) as { suggestions: unknown[] };

    expect(result.suggestions).toHaveLength(0);
  });
});
