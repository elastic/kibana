/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Integration test: exercises the REAL `@kbn/code-editor` ES|QL code action
// provider (not mocked) driven by our message registry, to prove the full chain
// — registry → getModelDependencies → provider → quick fix — actually yields a
// fix. It injects the message directly (with a fix-eligible `code`) so it does
// not depend on which codes `ESQLLang.validate` happens to emit.

import { ESQLLang, monaco } from '@kbn/code-editor';
import {
  registerEditorMessages,
  getModelDependencies,
  type EditorMessages,
} from './esql_editor_messages_registry';

const QUERY = 'FROM logs | KEEP agent-id';

// `agent-id` spans columns 18–26 in QUERY.
const message = {
  code: 'invalidUnquotedIdentifier',
  message: 'Invalid unquoted identifier',
  startLineNumber: 1,
  startColumn: 18,
  endLineNumber: 1,
  endColumn: 26,
  severity: monaco.MarkerSeverity.Error,
};

const makeModel = (uri: string) =>
  ({
    uri: { toString: () => uri },
    isDisposed: () => false,
    getValue: () => QUERY,
    getFullModelRange: () => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: QUERY.length + 1,
    }),
  } as unknown as monaco.editor.ITextModel);

const noopToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
} as unknown as monaco.CancellationToken;

describe('ES|QL code actions wiring', () => {
  it('produces a quick fix from a message published to the registry', async () => {
    const model = makeModel('model://code-actions/1');
    const dispose = registerEditorMessages(model.uri.toString(), () => ({
      errors: [message] as unknown as EditorMessages['errors'],
      warnings: [],
    }));

    try {
      const provider = ESQLLang.getCodeActionProvider!({ getModelDependencies });

      // The marker on the model mirrors what `useSplitQueryValidation` sets:
      // same position + message, but with `code` stripped for display.
      const marker = { ...message, code: undefined } as unknown as monaco.editor.IMarkerData;

      const result = await provider.provideCodeActions!(
        model,
        model.getFullModelRange(),
        { markers: [marker], trigger: 1, only: undefined } as monaco.languages.CodeActionContext,
        noopToken
      );

      const actions = result?.actions ?? [];
      expect(actions).toEqual([
        expect.objectContaining({ title: 'Wrap identifier in backticks', kind: 'quickfix' }),
      ]);
    } finally {
      dispose();
    }
  });

  it('produces no fix when the model has no registered messages', async () => {
    const model = makeModel('model://code-actions/unregistered');
    const provider = ESQLLang.getCodeActionProvider!({ getModelDependencies });

    const marker = { ...message, code: undefined } as unknown as monaco.editor.IMarkerData;
    const result = await provider.provideCodeActions!(
      model,
      model.getFullModelRange(),
      { markers: [marker], trigger: 1, only: undefined } as monaco.languages.CodeActionContext,
      noopToken
    );

    expect(result?.actions ?? []).toEqual([]);
  });
});
