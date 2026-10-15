/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';
import { MockedCodeEditor } from '@kbn/code-editor-mock';

const mockCodeEditor = jest.fn();

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: any) => {
      mockCodeEditor(props);
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

  test('renders variables with double braces by default', () => {
    const wrapper = mountWithIntl(<JsonEditorWithMessageVariables {...props} />);

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper.find('[data-test-subj="variableMenuButton-myVar"]').last().simulate('click');

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual(
      '{{myVar}}'
    );
  });

  test('renders variables with triple braces when specified', () => {
    const wrapper = mountWithIntl(
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

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper.find('[data-test-subj="variableMenuButton-myVar"]').last().simulate('click');

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual(
      '{{{myVar}}}'
    );
  });

  test('renders correct value when the input value prop updates', () => {
    const wrapper = mountWithIntl(<JsonEditorWithMessageVariables {...props} />);

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual('');

    const inputTargetValue = '{"new": "value"}';
    wrapper.setProps({ inputTargetValue });
    wrapper.update();

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual(
      inputTargetValue
    );
  });

  test('renders the validation decorations by default', () => {
    mountWithIntl(
      <JsonEditorWithMessageVariables {...props} inputTargetValue={'{"foo": "test"}'} />
    );

    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ renderValidationDecorations: 'on' }),
      })
    );
  });

  test('does not render the validation decorations when the value contains a mustache template', () => {
    mountWithIntl(
      <JsonEditorWithMessageVariables {...props} inputTargetValue={'{"foo": {{context.value}}}'} />
    );

    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ renderValidationDecorations: 'off' }),
      })
    );
  });

  test('does not render the validation decorations when the value is empty', () => {
    mountWithIntl(<JsonEditorWithMessageVariables {...props} />);

    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ renderValidationDecorations: 'off' }),
      })
    );
  });
});
