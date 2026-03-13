/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { OnDoneLoadJsonHandler } from './modal_provider';
import { ModalProvider } from './modal_provider';

import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

const renderModalProvider = ({ onDone }: { onDone: OnDoneLoadJsonHandler }) => {
  render(
    <I18nProvider>
      <KibanaContextProvider services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}>
        <ModalProvider onDone={onDone}>
          {(openModal) => (
            <button onClick={openModal} data-test-subj="button">
              Load JSON
            </button>
          )}
        </ModalProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('Load from JSON ModalProvider', () => {
  let onDone: jest.Mock;

  beforeEach(() => {
    onDone = jest.fn();
    renderModalProvider({ onDone });
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
    expect(onDone).not.toHaveBeenCalled();
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
    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: validPipeline } });

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
});
