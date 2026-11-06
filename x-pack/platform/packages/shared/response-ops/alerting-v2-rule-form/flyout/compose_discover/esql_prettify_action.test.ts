/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import { prettifyQuery } from '@kbn/esql-utils';
import { addPrettifyAction } from './esql_prettify_action';

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { KeyI: 39 },
    editor: { EditorOption: { fontInfo: 0 } },
  },
}));

jest.mock('@kbn/esql-utils', () => ({
  prettifyQuery: jest.fn(),
}));

const fullRange = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 };

const makeEditor = (value: string) => {
  const model = { getFullModelRange: () => fullRange };
  const editor = {
    addAction: jest.fn(),
    getModel: () => model,
    getValue: () => value,
    getLayoutInfo: () => ({ contentWidth: 800 }),
    getOption: () => ({ typicalHalfwidthCharacterWidth: 8 }),
    executeEdits: jest.fn(),
  };
  return editor as unknown as monaco.editor.IStandaloneCodeEditor & {
    addAction: jest.Mock;
    executeEdits: jest.Mock;
  };
};

const getRegisteredRun = (editor: { addAction: jest.Mock }) =>
  editor.addAction.mock.calls[0][0].run;

describe('addPrettifyAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a Cmd/Ctrl+I action', () => {
    const editor = makeEditor('FROM logs | WHERE a > 1');
    addPrettifyAction(editor);

    const action = editor.addAction.mock.calls[0][0];
    expect(action.id).toBe('alertingV2.esql.prettifyQuery');
    // CtrlCmd | KeyI === 2048 | 39
    // eslint-disable-next-line no-bitwise
    expect(action.keybindings).toEqual([2048 | 39]);
  });

  it('applies the prettified query when it differs', () => {
    const editor = makeEditor('FROM logs|WHERE a>1');
    jest.mocked(prettifyQuery).mockReturnValue('FROM logs\n| WHERE a > 1');
    addPrettifyAction(editor);

    getRegisteredRun(editor)(editor);

    expect(editor.executeEdits).toHaveBeenCalledWith('alertingV2.esql.prettify', [
      { range: fullRange, text: 'FROM logs\n| WHERE a > 1' },
    ]);
  });

  it('does nothing when the query is already formatted', () => {
    const query = 'FROM logs\n| WHERE a > 1';
    const editor = makeEditor(query);
    jest.mocked(prettifyQuery).mockReturnValue(query);
    addPrettifyAction(editor);

    getRegisteredRun(editor)(editor);

    expect(editor.executeEdits).not.toHaveBeenCalled();
  });

  it('does not wipe a fragment when prettifyQuery returns an empty string', () => {
    const editor = makeEditor('| WHERE delay > 15');
    jest.mocked(prettifyQuery).mockReturnValue('');
    addPrettifyAction(editor);

    getRegisteredRun(editor)(editor);

    expect(editor.executeEdits).not.toHaveBeenCalled();
  });

  it('leaves the content untouched when prettifying throws (e.g. a fragment)', () => {
    const editor = makeEditor('| WHERE a > 1');
    jest.mocked(prettifyQuery).mockImplementation(() => {
      throw new Error('parse error');
    });
    addPrettifyAction(editor);

    getRegisteredRun(editor)(editor);

    expect(editor.executeEdits).not.toHaveBeenCalled();
  });

  it('does nothing for an empty editor', () => {
    const editor = makeEditor('   ');
    addPrettifyAction(editor);

    getRegisteredRun(editor)(editor);

    expect(prettifyQuery).not.toHaveBeenCalled();
    expect(editor.executeEdits).not.toHaveBeenCalled();
  });
});
