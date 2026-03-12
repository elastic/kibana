/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { monaco } from '@kbn/monaco';
import type { ProcessorSuggestionsResponse } from '@kbn/streams-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import { JsonEditor } from './json_editor';

// Minimal stub for the CodeEditor to avoid mounting Monaco
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => null,
}));

jest.mock('../../../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { docLinks: { links: { ingest: { processors: '#', conditionalProcessor: '#' } } } },
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: jest.fn() } } } },
  }),
}));

const fixtures: ProcessorSuggestionsResponse = {
  processors: [
    { name: 'grok', template: { patterns: [] } },
    { name: 'set', template: { field: '', value: '' } },
  ],
  propertiesByProcessor: {
    grok: [
      { name: 'field', template: '' },
      { name: 'patterns', template: [] },
    ],
    set: [
      { name: 'field', template: '' },
      { name: 'value', template: '' },
    ],
  },
};

jest.mock('../../../../helpers', () => {
  const actual = jest.requireActual('../../../../helpers');
  return {
    ...actual,
    fetchProcessorSuggestions: jest.fn(async () => fixtures),
  };
});

function Wrapper() {
  const methods = useForm({ defaultValues: { processors: [] } });
  return (
    <FormProvider {...methods}>
      <JsonEditor />
    </FormProvider>
  );
}

interface FakeModel {
  getLineContent: (line: number) => string;
  getLineMaxColumn: (line: number) => number;
  getValueInRange: (r: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }) => string;
  getWordUntilPosition: (p: { lineNumber: number; column: number }) => {
    word: string;
    startColumn: number;
    endColumn: number;
  };
}

const createFakeModel = (lines: string[]): FakeModel => {
  const getLineContent = (line: number) => lines[line - 1] || '';
  const getLineMaxColumn = (line: number) => (lines[line - 1] ? lines[line - 1].length + 1 : 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getValueInRange = ({ startLineNumber, startColumn, endLineNumber, endColumn }: any) => {
    if (startLineNumber === endLineNumber) {
      const s = getLineContent(startLineNumber);
      return s.slice(startColumn - 1, endColumn - 1);
    }
    const parts: string[] = [];
    const first = getLineContent(startLineNumber);
    parts.push(first.slice(startColumn - 1));
    for (let ln = startLineNumber + 1; ln < endLineNumber; ln++) {
      parts.push(getLineContent(ln));
    }
    const last = getLineContent(endLineNumber);
    parts.push(last.slice(0, Math.max(0, endColumn - 1)));
    return parts.join('\n');
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getWordUntilPosition = ({ column, lineNumber }: any) => ({
    word: '',
    startColumn: column,
    endColumn: column,
  });
  return { getLineContent, getLineMaxColumn, getValueInRange, getWordUntilPosition };
};

describe('JsonEditor autocomplete provider', () => {
  let capturedProvider: monaco.languages.CompletionItemProvider | undefined;

  beforeEach(() => {
    capturedProvider = undefined;
    jest
      .spyOn(monaco.languages, 'registerCompletionItemProvider')
      .mockImplementation(
        (
          _selector: string | monaco.languages.LanguageSelector,
          provider: monaco.languages.CompletionItemProvider
        ): monaco.IDisposable => {
          capturedProvider = provider;
          const disposable: monaco.IDisposable = { dispose: () => {} };
          return disposable;
        }
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const completionContext: monaco.languages.CompletionContext = {
    triggerKind: monaco.languages.CompletionTriggerKind.Invoke,
  };
  const cancellationToken: monaco.CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };

  it('suggests processor types at key positions', async () => {
    render(
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    );
    await waitFor(() => expect(capturedProvider).toBeDefined());

    const model = createFakeModel([
      '[',
      '  { "',
      '  }',
      ']',
    ]) as unknown as monaco.editor.ITextModel;
    const position = { lineNumber: 2, column: 6 } as monaco.Position; // after opening quote

    const res = await capturedProvider!.provideCompletionItems!(
      model,
      position,
      completionContext,
      cancellationToken
    );
    const labels = (res as monaco.languages.CompletionList).suggestions.map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(['grok', 'set']));
  });

  it('suggests processor properties inside a processor object', async () => {
    render(
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    );
    await waitFor(() => expect(capturedProvider).toBeDefined());

    const model = createFakeModel([
      '[',
      '  { "grok": { "',
      '  }',
      ']',
    ]) as unknown as monaco.editor.ITextModel;
    const position = { lineNumber: 2, column: 17 } as monaco.Position;

    const res = await capturedProvider!.provideCompletionItems!(
      model,
      position,
      completionContext,
      cancellationToken
    );
    const labels = (res as monaco.languages.CompletionList).suggestions.map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(['field', 'patterns']));
  });

  it('advances range end when the next char is a closing quote', async () => {
    render(
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    );
    await waitFor(() => expect(capturedProvider).toBeDefined());

    // Include a closing quote at the cursor so the provider extends endColumn by 1
    const withClosing = createFakeModel([
      '[',
      '  { ""',
      '  }',
      ']',
    ]) as unknown as monaco.editor.ITextModel;
    const position = { lineNumber: 2, column: 6 } as monaco.Position;

    const res = (await capturedProvider!.provideCompletionItems!(
      withClosing,
      position,
      completionContext,
      cancellationToken
    )) as monaco.languages.CompletionList;
    const suggestion = res.suggestions[0];
    const r = suggestion.range as monaco.IRange | monaco.languages.CompletionItemRanges;
    const endColumn = 'endColumn' in r ? r.endColumn : r.insert.endColumn;
    expect(endColumn).toBeGreaterThan(position.column);
  });
});
