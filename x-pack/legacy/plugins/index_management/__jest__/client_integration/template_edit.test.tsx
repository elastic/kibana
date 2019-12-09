/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { TemplateFormTestBed } from './helpers/template_form.helpers';
import * as fixtures from '../../test/fixtures';
import { TEMPLATE_NAME, SETTINGS, MAPPINGS, ALIASES } from './helpers/constants';

const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];

const { setup } = pageHelpers.templateEdit;

jest.mock('ui/new_platform');

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
  // which does not produce a valid component wrapper
  EuiComboBox: (props: any) => (
    <input
      data-test-subj="mockComboBox"
      onChange={(syntheticEvent: any) => {
        props.onChange([syntheticEvent['0']]);
      }}
    />
  ),
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

describe('<TemplateEdit />', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  const templateToEdit = fixtures.getTemplate({
    name: TEMPLATE_NAME,
    indexPatterns: ['indexPattern1'],
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadTemplateResponse(templateToEdit);

    testBed = await setup();

    await act(async () => {
      await nextTick();
      testBed.component.update();
    });
  });

  test('should set the correct page title', () => {
    const { exists, find } = testBed;
    const { name } = templateToEdit;

    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual(`Edit template '${name}'`);
  });

  it('should set the nameField to readOnly', () => {
    const { find } = testBed;

    const nameInput = find('nameField.input');
    expect(nameInput.props().disabled).toEqual(true);
  });

  describe('form payload', () => {
    beforeEach(async () => {
      const { actions } = testBed;

      await act(async () => {
        // Complete step 1 (logistics)
        await actions.completeStepOne({
          indexPatterns: UPDATED_INDEX_PATTERN,
        });

        // Step 2 (index settings)
        await actions.completeStepTwo(JSON.stringify(SETTINGS));

        // Step 3 (mappings)
        await actions.completeStepThree(JSON.stringify(MAPPINGS));

        // Step 4 (aliases)
        await actions.completeStepFour(JSON.stringify(ALIASES));
      });
    });

    it('should send the correct payload with changed values', async () => {
      const { actions } = testBed;

      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
      });

      const latestRequest = server.requests[server.requests.length - 1];

      const { version, order } = templateToEdit;

      const expected = JSON.stringify({
        name: TEMPLATE_NAME,
        version,
        order,
        indexPatterns: UPDATED_INDEX_PATTERN,
        isManaged: false,
        settings: SETTINGS,
        mappings: MAPPINGS,
        aliases: ALIASES,
      });

      expect(JSON.parse(latestRequest.requestBody).body).toEqual(expected);
    });
  });
});
