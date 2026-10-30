/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React, { useEffect, useRef, useState } from 'react';
import { parseInlineParams } from '../helpers/parse_inline_params';
import { getInlineActionStepDefinition } from '../registry';
import { ParamsEditor } from './params_editor';

interface Position {
  lineNumber: number;
  column: number;
}

interface Range {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

const collapsedRange = ({ lineNumber, column }: Position): Range => ({
  startLineNumber: lineNumber,
  startColumn: column,
  endLineNumber: lineNumber,
  endColumn: column,
});

// Stands in for the Monaco editor: keeps its own text, applies edits and reports them via onChange.
const mockCreateEditor = (initialText: string, emitChange: (next: string) => void) => {
  let text = initialText;
  // Monaco reports a 1:1 selection until the user places the cursor.
  let selection = collapsedRange({ lineNumber: 1, column: 1 });
  let onFocus = () => {};

  const getOffsetAt = ({ lineNumber, column }: Position): number =>
    text
      .split('\n')
      .slice(0, lineNumber - 1)
      .reduce((offset, line) => offset + line.length + 1, 0) +
    column -
    1;

  const getPositionAt = (offset: number): Position => {
    const lines = text.slice(0, offset).split('\n');
    return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
  };

  const model = {
    getValue: () => text,
    getOffsetAt,
    getPositionAt,
    getFullModelRange: () => ({ getEndPosition: () => getPositionAt(text.length) }),
  };

  return {
    getModel: () => model,
    getSelection: () => selection,
    setPosition: (position: Position) => {
      selection = collapsedRange(position);
    },
    executeEdits: jest.fn((_source: string, edits: Array<{ range: Range; text: string }>) => {
      const [{ range, text: inserted }] = edits;
      const start = getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
      const end = getOffsetAt({ lineNumber: range.endLineNumber, column: range.endColumn });
      text = `${text.slice(0, start)}${inserted}${text.slice(end)}`;
      emitChange(text);
    }),
    focus: jest.fn(() => onFocus()),
    onDidFocusEditorText: (listener: () => void) => {
      onFocus = listener;
      return { dispose: () => {} };
    },
    // Simulates the user clicking into the editor at `position`.
    placeCursor: (position: Position) => {
      selection = collapsedRange(position);
      onFocus();
    },
  };
};

type MockEditor = ReturnType<typeof mockCreateEditor>;

let mockEditor: MockEditor | undefined;
let mockMountEditor = true;

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    editorDidMount,
  }: {
    value: string;
    onChange: (next: string) => void;
    editorDidMount?: (editor: MockEditor) => void;
  }) => {
    const initialValueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    useEffect(() => {
      if (!mockMountEditor) {
        return;
      }
      mockEditor = mockCreateEditor(initialValueRef.current, (next) => onChangeRef.current(next));
      editorDidMount?.(mockEditor);
    }, [editorDidMount]);
    return <textarea data-test-subj="singleStepWorkflowParamsEditor" value={value} readOnly />;
  },
}));

const POLICY_ID = 'inputs.payload.policyId';
const TEMPLATE = `{{ ${POLICY_ID} }}`;

const getMockEditor = (): MockEditor => {
  if (!mockEditor) {
    throw new Error('Expected the params editor to be mounted');
  }
  return mockEditor;
};

const renderParamsEditor = (initialValue: string): jest.Mock<void, [string]> => {
  const onChange = jest.fn<void, [string]>();
  const Harness = () => {
    const [value, setValue] = useState(initialValue);
    return (
      <ParamsEditor
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  };
  render(
    <I18nProvider>
      <Harness />
    </I18nProvider>
  );
  return onChange;
};

const selectVariable = (name: string) => {
  fireEvent.click(screen.getByTestId('singleStepWorkflowParamsAddVariableButton'));
  fireEvent.change(screen.getByTestId('messageVariablesSelectableSearch'), {
    target: { value: name },
  });
  fireEvent.click(screen.getByTestId(`${name}-selectableOption`));
};

const getStoredParams = (onChange: jest.Mock<void, [string]>) => {
  const definition = getInlineActionStepDefinition('email');
  if (!definition) {
    throw new Error('Expected the email step definition to be registered');
  }
  const [stored] = onChange.mock.calls[onChange.mock.calls.length - 1];
  return parseInlineParams(definition, stored);
};

describe('ParamsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor = undefined;
    mockMountEditor = true;
  });

  it('quotes a variable inserted at the cursor after an empty key', () => {
    const onChange = renderParamsEditor(
      'to:\n  - ops@example.com\nsubject: \nmessage: |\n  Alerts fired\n'
    );

    getMockEditor().placeCursor({ lineNumber: 3, column: 10 });
    selectVariable(POLICY_ID);

    expect(getStoredParams(onChange)).toEqual({
      params: { to: ['ops@example.com'], subject: TEMPLATE, message: 'Alerts fired\n' },
      errors: [],
    });
  });

  it('keeps a variable bare when the cursor is inside existing quotes', () => {
    const onChange = renderParamsEditor(
      'to:\n  - ops@example.com\nsubject: ""\nmessage: |\n  Alerts fired\n'
    );

    getMockEditor().placeCursor({ lineNumber: 3, column: 11 });
    selectVariable(POLICY_ID);

    expect(getMockEditor().executeEdits).toHaveBeenCalledWith(expect.any(String), [
      expect.objectContaining({ text: TEMPLATE }),
    ]);
    expect(getStoredParams(onChange)).toEqual({
      params: { to: ['ops@example.com'], subject: TEMPLATE, message: 'Alerts fired\n' },
      errors: [],
    });
  });

  it('appends the variable at the end when the editor has never been focused', () => {
    const onChange = renderParamsEditor(
      'to:\n  - ops@example.com\nmessage: |\n  Alerts fired\nsubject: '
    );

    selectVariable(POLICY_ID);

    expect(getStoredParams(onChange)).toEqual({
      params: { to: ['ops@example.com'], subject: TEMPLATE, message: 'Alerts fired\n' },
      errors: [],
    });
  });

  it('keeps inserting after the previous variable once one has been added', () => {
    const onChange = renderParamsEditor(
      'to:\n  - ops@example.com\nsubject: Alert\nmessage: |\n  Policy '
    );

    selectVariable(POLICY_ID);
    selectVariable('inputs.payload.id');

    expect(getStoredParams(onChange)).toEqual({
      params: {
        to: ['ops@example.com'],
        subject: 'Alert',
        message: `Policy ${TEMPLATE}{{ inputs.payload.id }}\n`,
      },
      errors: [],
    });
  });

  it('appends a valid value when the editor is not mounted', () => {
    mockMountEditor = false;
    const onChange = renderParamsEditor(
      'to:\n  - ops@example.com\nmessage: |\n  Alerts fired\nsubject: '
    );

    selectVariable(POLICY_ID);

    expect(getStoredParams(onChange)).toEqual({
      params: { to: ['ops@example.com'], subject: TEMPLATE, message: 'Alerts fired\n' },
      errors: [],
    });
  });
});
