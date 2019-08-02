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
import { TemplatesCreateTestBed } from './helpers/templates_create.helpers';
import { INVALID_CHARACTERS } from '../../common/constants';

const { setup } = pageHelpers.templatesCreate;

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

const DEFAULT_TEMPLATE_NAME = 'my_template';
const DEFAULT_INDEX_PATTERNS = ['index1'];
const DEFAULT_SETTINGS = {
  number_of_shards: 1,
  index: {
    lifecycle: {
      name: 'my_policy',
    },
  },
};
const DEFAULT_ALIASES = {
  alias: {
    filter: {
      term: { user: 'my_user' },
    },
  },
};

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
describe.skip('<TemplatesCreate />', () => {
  let testBed: TemplatesCreateTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      testBed = await setup();
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;

      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create template');
    });

    test('should not let the user go to the next step if some fields are missing', () => {
      const { form, actions } = testBed;

      actions.clickNextButton();

      expect(form.getErrorsMessages()).toEqual([
        'Template name is required.',
        'You must define at least one index pattern.',
      ]);
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      testBed = await setup();
    });

    describe('index patterns (step 1)', () => {
      it('should not allow invalid characters', () => {
        const { form, actions, find } = testBed;

        const expectErrorForChar = (char: string) => {
          find('mockComboBox').simulate('change', [{ label: `with${char}`, value: `with${char}` }]); // Using mocked EuiComboBox
          actions.clickNextButton();

          try {
            expect(form.getErrorsMessages()).toContain(
              `'with${char}' index pattern contains illegal characters.`
            );
          } catch {
            throw new Error(`Invalid character ${char} did not display an error.`);
          }
        };

        INVALID_CHARACTERS.forEach(expectErrorForChar);

        actions.clickNextButton();
      });
    });

    describe('index settings (step 2)', () => {
      beforeEach(() => {
        const { actions } = testBed;

        // Complete step 1 (logistics)
        actions.completeStepOne({ name: DEFAULT_TEMPLATE_NAME, indexPatterns: ['index1'] });
      });

      it('should not allow invalid json', async () => {
        const { form, actions } = testBed;

        // Complete step 2 (index settings) with invalid json
        actions.completeStepTwo({
          settings: '{ invalidJsonString ',
        });

        expect(form.getErrorsMessages()).toContain('Invalid JSON format.');
      });
    });

    describe('aliases (step 4)', () => {
      beforeEach(() => {
        const { actions } = testBed;

        // Complete step 1 (logistics)
        actions.completeStepOne({ name: DEFAULT_TEMPLATE_NAME, indexPatterns: ['index1'] });

        // Complete step 2 (index settings)
        actions.completeStepTwo({
          settings: '{}',
        });

        // Complete step 3 (mappings)
        actions.completeStepThree();
      });

      it('should not allow invalid json', async () => {
        const { actions, form } = testBed;
        // Complete step 4 (aliases) with invalid json
        actions.completeStepFour({
          aliases: '{ invalidJsonString ',
        });

        expect(form.getErrorsMessages()).toContain('Invalid JSON format.');
      });
    });
  });

  describe('review and save', () => {
    beforeEach(async () => {
      testBed = await setup();

      const { actions } = testBed;

      // Complete step 1 (logistics)
      actions.completeStepOne({
        name: DEFAULT_TEMPLATE_NAME,
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      });

      // Complete step 2 (index settings)
      actions.completeStepTwo({
        settings: JSON.stringify(DEFAULT_SETTINGS),
      });

      // Complete step 3 (mappings)
      actions.completeStepThree();

      // Complete step 4 (aliases)
      actions.completeStepFour({
        aliases: JSON.stringify(DEFAULT_ALIASES),
      });
    });

    it('should set the correct step title', () => {
      const { find, exists } = testBed;
      expect(exists('stepSummary')).toBe(true);
      expect(find('stepTitle').text()).toEqual(`Review details for '${DEFAULT_TEMPLATE_NAME}'`);
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('summaryTabContent').find('.euiTab').length).toBe(2);
        expect(
          find('summaryTabContent')
            .find('.euiTab')
            .map(t => t.text())
        ).toEqual(['Summary', 'JSON']);
      });

      test('should navigate to JSON tab', async () => {
        const { exists, actions } = testBed;

        expect(exists('summaryTab')).toBe(true);
        expect(exists('jsonTab')).toBe(false);

        actions.selectSummaryTab('json');

        expect(exists('summaryTab')).toBe(false);
        expect(exists('jsonTab')).toBe(true);
      });
    });

    it('should render a warning message if a wildcard is used as an index pattern', async () => {
      testBed = await setup();

      const { actions, exists, find } = testBed;

      // Complete step 1 (logistics)
      actions.completeStepOne({
        name: DEFAULT_TEMPLATE_NAME,
        indexPatterns: ['*'], // Set wildcard index pattern
      });

      // Complete step 2 (index settings)
      actions.completeStepTwo({
        settings: JSON.stringify({}),
      });

      // Complete step 3 (mappings)
      actions.completeStepThree();

      // Complete step 4 (aliases)
      actions.completeStepFour({
        aliases: JSON.stringify({}),
      });

      expect(exists('indexPatternsWarning')).toBe(true);
      expect(find('indexPatternsWarningDescription').text()).toEqual(
        'This template contains a wildcard (*) as an index pattern. This will create a catch-all template and apply to all indices. Edit template.'
      );
    });
  });

  describe('form payload & api errors', () => {
    beforeEach(async () => {
      testBed = await setup();

      const { actions } = testBed;

      // Complete step 1 (logistics)
      actions.completeStepOne({
        name: DEFAULT_TEMPLATE_NAME,
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      });

      // Complete step 2 (index settings)
      actions.completeStepTwo({
        settings: JSON.stringify(DEFAULT_SETTINGS),
      });

      // Complete step 3 (mappings)
      actions.completeStepThree();

      // Complete step 4 (aliases)
      actions.completeStepFour({
        aliases: JSON.stringify(DEFAULT_ALIASES),
      });
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
          name: DEFAULT_TEMPLATE_NAME,
          indexPatterns: DEFAULT_INDEX_PATTERNS,
          version: '',
          order: '',
          settings: JSON.stringify(DEFAULT_SETTINGS),
          mappings: {},
          aliases: JSON.stringify(DEFAULT_ALIASES),
        })
      );
    });

    it('should surface the API errors from the put HTTP request', async () => {
      const { component, actions, find, exists } = testBed;

      const error = {
        status: 409,
        error: 'Conflict',
        message: `There is already a template with name '${DEFAULT_TEMPLATE_NAME}'`,
      };

      httpRequestsMockHelpers.setSaveTemplateResponse(undefined, { body: error });

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
        component.update();
      });

      expect(exists('saveTemplateError')).toBe(true);
      expect(find('saveTemplateError').text()).toContain(error.message);
    });
  });
});
