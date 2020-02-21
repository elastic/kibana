/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Mocking EuiCodeEditor, which uses React Ace under the hood
  EuiCodeEditor: (props: any) => (
    <input
      data-test-subj="mockCodeEditor"
      onChange={(syntheticEvent: any) => {
        props.onChange(syntheticEvent.jsonString);
      }}
    />
  ),
}));

import { registerTestBed, nextTick, TestBed } from '../../../../../../../../../test_utils';
import { LoadMappingsProvider } from './load_mappings_provider';

const ComponentToTest = ({ onJson }: { onJson: () => void }) => (
  <LoadMappingsProvider onJson={onJson}>
    {openModal => (
      <button onClick={openModal} data-test-subj="load-json-button">
        Load JSON
      </button>
    )}
  </LoadMappingsProvider>
);

const setup = (props: any) =>
  registerTestBed(ComponentToTest, {
    memoryRouter: { wrapComponent: false },
    defaultProps: props,
  })();

const openModalWithJsonContent = ({ find, component }: TestBed) => async (json: any) => {
  find('load-json-button').simulate('click');
  component.update();

  // Set the mappings to load
  // @ts-ignore
  await act(async () => {
    find('mockCodeEditor').simulate('change', {
      jsonString: JSON.stringify(json),
    });
    await nextTick(300); // There is a debounce in the JsonEditor that we need to wait for
  });
};

describe('<LoadMappingsProvider />', () => {
  test('it should forward valid mapping definition', async () => {
    const mappingsToLoad = {
      properties: {
        title: {
          type: 'text',
        },
      },
    };

    const onJson = jest.fn();
    const testBed = await setup({ onJson });

    // Open the modal and add the JSON
    await openModalWithJsonContent(testBed)(mappingsToLoad);

    // Confirm
    testBed.find('confirmModalConfirmButton').simulate('click');

    const [jsonReturned] = onJson.mock.calls[0];
    expect(jsonReturned).toEqual({ ...mappingsToLoad, dynamic_templates: [] });
  });
});
