/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';
import { MockedCodeEditor } from '@kbn/code-editor-mock';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockedCodeEditor {...props} />;
    },
  };
});

describe('JsonEditorWithMessageVariables', () => {
  const onDocumentsChange = jest.fn();
  const props = {
    messageVariables: [
      {
        name: 'myVar',
        description: 'My variable description',
      },
    ],
    paramsProperty: 'foo',
    label: 'label',
    onDocumentsChange,
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders variables with double braces by default', async () => {
    render(<JsonEditorWithMessageVariables {...props} />);

    await userEvent.click(screen.getByTestId('fooAddVariableButton'));
    await userEvent.click(screen.getByTestId('variableMenuButton-myVar'));

    expect(screen.getByTestId('fooJsonEditor').getAttribute('data-currentvalue')).toEqual(
      '{{myVar}}'
    );
  });

  test('renders variables with triple braces when specified', async () => {
    render(
      <JsonEditorWithMessageVariables
        {...props}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    await userEvent.click(screen.getByTestId('fooAddVariableButton'));
    await userEvent.click(screen.getByTestId('variableMenuButton-myVar'));

    expect(screen.getByTestId('fooJsonEditor').getAttribute('data-currentvalue')).toEqual(
      '{{{myVar}}}'
    );
  });

  test('renders correct value when the input value prop updates', () => {
    const { rerender } = render(<JsonEditorWithMessageVariables {...props} />);
    const fooJsonEditor = screen.getByTestId('fooJsonEditor');

    expect(fooJsonEditor.getAttribute('data-currentvalue')).toEqual('');

    const inputTargetValue = '{"new": "value"}';
    rerender(<JsonEditorWithMessageVariables {...props} inputTargetValue={inputTargetValue} />);

    expect(fooJsonEditor.getAttribute('data-currentvalue')).toEqual(inputTargetValue);
  });
});
