/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { JsonEditorField } from './json_editor_field';
import { MockedCodeEditor } from '@kbn/code-editor-mock';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { MockedMonacoEditor } from '@kbn/code-editor-mock/monaco_mock';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: ComponentProps<typeof MockedMonacoEditor>) => (
      <MockedCodeEditor {...props} />
    ),
  };
});

const setXJson = jest.fn();
const XJson = {
  useXJsonMode: (value: unknown) => ({
    convertToJson: (toJson: unknown) => toJson,
    setXJson,
    xJson: value,
  }),
};

jest.mock('@kbn/es-ui-shared-plugin/public', () => {
  const original = jest.requireActual('@kbn/es-ui-shared-plugin/public');
  return {
    ...original,
    XJson,
  };
});

// FLAKY: https://github.com/elastic/kibana/issues/207077
describe.skip('JsonEditorField', () => {
  const setValue = jest.fn();
  const props = {
    field: {
      label: 'my label',
      helpText: 'help',
      value: 'foobar',
      setValue,
      errors: [],
    } as unknown as FieldHook<unknown, string>,
    paramsProperty: 'myField',
    label: 'label',
    dataTestSubj: 'foobarTestSubj',
  };

  beforeEach(() => jest.resetAllMocks());

  it('renders as expected', async () => {
    render(<JsonEditorField {...props} />);

    expect(await screen.findByTestId('foobarTestSubj')).toBeInTheDocument();
    expect(await screen.findByTestId('myFieldJsonEditor')).toBeInTheDocument();
    expect(await screen.findByText('my label')).toBeInTheDocument();
  });

  it('calls setValue and xJson on editor change', async () => {
    render(<JsonEditorField {...props} />);

    await userEvent.click(await screen.findByTestId('myFieldJsonEditor'));
    await userEvent.paste('JSON');

    await waitFor(() => {
      expect(setValue).toBeCalledWith('foobarJSON');
    });

    expect(setXJson).toBeCalledWith('foobarJSON');
  });
});
