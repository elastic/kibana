/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import { ParamsEditor } from './params_editor';

const selection = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
const mockEditor = {
  getSelection: jest.fn(() => selection),
  executeEdits: jest.fn(),
  focus: jest.fn(),
};
let mockMountEditor = true;

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    editorDidMount,
  }: {
    value: string;
    editorDidMount?: (editor: typeof mockEditor) => void;
  }) => {
    useEffect(() => {
      if (mockMountEditor) {
        editorDidMount?.(mockEditor);
      }
    }, [editorDidMount]);
    return <textarea data-test-subj="singleStepWorkflowParamsEditor" value={value} readOnly />;
  },
}));

const selectVariable = (name: string) => {
  fireEvent.click(screen.getByTestId('singleStepWorkflowParamsAddVariableButton'));
  fireEvent.change(screen.getByTestId('messageVariablesSelectableSearch'), {
    target: { value: name },
  });
  fireEvent.click(screen.getByTestId(`${name}-selectableOption`));
};

describe('ParamsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMountEditor = true;
  });

  it('inserts the selected payload variable at the editor cursor', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <ParamsEditor value="text: " onChange={onChange} />
      </I18nProvider>
    );

    selectVariable('inputs.payload.policyId');

    expect(mockEditor.executeEdits).toHaveBeenCalledWith(expect.any(String), [
      { range: selection, text: '{{ inputs.payload.policyId }}', forceMoveMarkers: true },
    ]);
    expect(mockEditor.focus).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('appends the selected variable when the editor is not mounted', () => {
    mockMountEditor = false;
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <ParamsEditor value="text: " onChange={onChange} />
      </I18nProvider>
    );

    selectVariable('alert.alert_url');

    expect(onChange).toHaveBeenCalledWith('text: {{ alert.alert_url }}');
  });
});
