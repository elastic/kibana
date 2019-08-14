/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import axios from 'axios';

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { TemplateFormTestBed } from './helpers/template_form.helpers';
import * as fixtures from '../../test/fixtures';
import { TEMPLATE_NAME, INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS } from './helpers/constants';
import { Template } from '../../common/types';

const { setup } = pageHelpers.templateClone;

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

interface TemplateFormProps {
  onSave: (template: Template) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  template: Template;
  isEditing?: boolean;
}

jest.mock('ui/chrome', () => ({
  breadcrumbs: { set: () => {} },
  addBasePath: (path: string) => path || '/api/index_management',
}));

jest.mock('../../public/services/api', () => ({
  ...jest.requireActual('../../public/services/api'),
  loadIndexPatterns: async () => {
    const INDEX_PATTERNS = [
      { attributes: { title: 'index1' } },
      { attributes: { title: 'index2' } },
      { attributes: { title: 'index3' } },
    ];
    return await INDEX_PATTERNS;
  },
  getHttpClient: () => mockHttpClient,
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
  // which does not produce a valid component wrapper
  EuiComboBox: (props: any) => (
    <input
      data-test-subj="mockComboBox"
      onChange={async (syntheticEvent: any) => {
        props.onChange([syntheticEvent['0']]);
      }}
    />
  ),
  // Mocking EuiCodeEditor, which uses React Ace under the hood
  EuiCodeEditor: (props: any) => (
    <input
      data-test-subj="mockCodeEditor"
      onChange={async (syntheticEvent: any) => {
        props.onChange(syntheticEvent.jsonString);
      }}
    />
  ),
}));

// We need to skip the tests until react 16.9.0 is released
// which supports asynchronous code inside act()
describe.skip('Clone template', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  const templateToClone = fixtures.getTemplate({
    name: TEMPLATE_NAME,
    indexPatterns: ['indexPattern1'],
  });

  beforeEach(async () => {
    testBed = await setup();

    httpRequestsMockHelpers.setLoadTemplateResponse(templateToClone);

    // @ts-ignore (remove when react 16.9.0 is released)
    await act(async () => {
      await nextTick();
      testBed.component.update();
    });
  });

  test('should set the correct page title', () => {
    const { exists, find } = testBed;

    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual(`Clone template '${templateToClone.name}'`);
  });

  test('should have the correct props', async () => {
    const { component } = testBed;
    const templateForm = component.find('TemplateForm').props() as TemplateFormProps;

    expect(templateForm.template).toEqual({
      ...templateToClone,
      name: `${templateToClone.name}-copy`,
      indexPatterns: [],
      aliases: undefined,
    });
  });

  describe('form payload', () => {
    beforeEach(async () => {
      const { actions } = testBed;

      // Complete step 1 (logistics)
      // Specify index patterns, but do not change name (keep default)
      actions.completeStepOne({
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      });

      // Bypass step 2 (index settings)
      actions.clickNextButton();

      // Bypass step 3 (mappings)
      actions.clickNextButton();

      // Bypass step 4 (aliases)
      actions.clickNextButton();
    });

    it('should send the correct payload', async () => {
      const { actions } = testBed;

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
      });

      const latestRequest = server.requests[server.requests.length - 1];

      expect(latestRequest.requestBody).toEqual(
        JSON.stringify({
          ...templateToClone,
          name: `${templateToClone.name}-copy`,
          indexPatterns: DEFAULT_INDEX_PATTERNS,
          aliases: undefined,
        })
      );
    });
  });
});
