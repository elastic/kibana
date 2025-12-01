/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
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

  const CodeEditorMock = (props: any) => (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-currentvalue={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
      }}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

import { LoadMappingsProvider } from './load_mappings_provider';

const ComponentToTest = ({ onJson }: { onJson: () => void }) => (
  <I18nProvider>
    <KibanaContextProvider services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}>
      <LoadMappingsProvider onJson={onJson} esNodesPlugins={[]}>
        {(openModal) => (
          <button onClick={openModal} data-test-subj="load-json-button">
            Load JSON
          </button>
        )}
      </LoadMappingsProvider>
    </KibanaContextProvider>
  </I18nProvider>
);

describe('<LoadMappingsProvider />', () => {
  test('it should forward valid mapping definition', () => {
    const mappingsToLoad = {
      properties: {
        title: {
          type: 'text',
        },
      },
    };

    const onJson = jest.fn();

    render(<ComponentToTest onJson={onJson} />);

    // Open the modal
    fireEvent.click(screen.getByTestId('load-json-button'));

    // Add JSON content to the editor
    const editor = screen.getByTestId('mockCodeEditor');
    editor.setAttribute('data-currentvalue', JSON.stringify(mappingsToLoad));
    fireEvent.change(editor);

    // Confirm
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual({ ...mappingsToLoad, dynamic_templates: [] });
  });
});
