/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { OnDoneLoadJsonHandler } from './modal_provider';
import { ModalProvider } from './modal_provider';

import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: any) => fn,
  };
});

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj="mockedCodeEditor"
        value={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.value);
        }}
      />
    ),
  };
});

const setup = ({ onDone }: { onDone: OnDoneLoadJsonHandler }) => {
  renderWithI18n(
    <KibanaContextProvider services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}>
      <ModalProvider onDone={onDone}>
        {(openModal) => {
          return (
            <button onClick={openModal} data-test-subj="button">
              Load JSON
            </button>
          );
        }}
      </ModalProvider>
    </KibanaContextProvider>
  );
};

describe('Load from JSON ModalProvider', () => {
  let onDone: jest.Mock;

  beforeEach(async () => {
    onDone = jest.fn();
    setup({ onDone });
  });

  it('displays errors', () => {
    fireEvent.click(screen.getByTestId('button'));

    const modal = screen.getByTestId('loadJsonConfirmationModal');

    const invalidPipeline = '{}';
    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: invalidPipeline } });
    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

    expect(within(modal).getByTestId('errorCallOut')).toHaveTextContent(
      'Please ensure the JSON is a valid pipeline object.'
    );
    expect(within(modal).getByTestId('confirmModalConfirmButton')).toBeDisabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('clears serialization errors on edit and re-enables submit', async () => {
    fireEvent.click(screen.getByTestId('button'));

    const modal = screen.getByTestId('loadJsonConfirmationModal');

    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: '{}' } });
    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
    expect(within(modal).getByTestId('errorCallOut')).toBeInTheDocument();
    expect(within(modal).getByTestId('confirmModalConfirmButton')).toBeDisabled();

    const validPipeline = JSON.stringify({ processors: [] });
    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: validPipeline } });

    expect(within(modal).queryByTestId('errorCallOut')).not.toBeInTheDocument();
    expect(within(modal).getByTestId('confirmModalConfirmButton')).not.toBeDisabled();

    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
    await waitFor(() =>
      expect(screen.queryByTestId('loadJsonConfirmationModal')).not.toBeInTheDocument()
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('passes through a valid pipeline object', async () => {
    fireEvent.click(screen.getByTestId('button'));

    const modal = screen.getByTestId('loadJsonConfirmationModal');

    const validPipeline = JSON.stringify({
      processors: [{ set: { field: 'test', value: 123 } }, { badType1: null }, { badType2: 1 }],
      on_failure: [
        {
          gsub: {
            field: '_index',
            pattern: '(.monitoring-\\w+-)6(-.+)',
            replacement: '$17$2',
          },
        },
      ],
    });
    const codeEditor = within(modal).getByTestId('mockedCodeEditor');
    fireEvent.change(codeEditor, { target: { value: validPipeline } });

    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
    await waitFor(() =>
      expect(screen.queryByTestId('loadJsonConfirmationModal')).not.toBeInTheDocument()
    );
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "on_failure": Array [
          Object {
            "gsub": Object {
              "field": "_index",
              "pattern": "(.monitoring-\\\\w+-)6(-.+)",
              "replacement": "$17$2",
            },
          },
        ],
        "processors": Array [
          Object {
            "set": Object {
              "field": "test",
              "value": 123,
            },
          },
          Object {
            "badType1": null,
          },
          Object {
            "badType2": 1,
          },
        ],
      }
    `);
  });

  it('passes through a valid pipeline object with triple-quoted strings (xJSON)', async () => {
    fireEvent.click(screen.getByTestId('button'));
    const modal = screen.getByTestId('loadJsonConfirmationModal');
    const validPipelineWithTripleQuotes = `{
      "processors": [
        {
          "script": {
            "description": "add a test_field",
            "lang": "painless",
            "source": """ctx['test_field'] = 'This is a test'"""
          }
        }
      ]
    }`;
    const codeEditor = within(modal).getByTestId('mockedCodeEditor');
    fireEvent.change(codeEditor, { target: { value: validPipelineWithTripleQuotes } });

    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
    await waitFor(() =>
      expect(screen.queryByTestId('loadJsonConfirmationModal')).not.toBeInTheDocument()
    );
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "processors": Array [
          Object {
            "script": Object {
              "description": "add a test_field",
              "lang": "painless",
              "source": "ctx['test_field'] = 'This is a test'",
            },
          },
        ],
      }
    `);
  });
});
