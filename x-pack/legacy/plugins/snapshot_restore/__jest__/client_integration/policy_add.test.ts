/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import * as fixtures from '../../test/fixtures';

import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { PolicyFormTestBed } from './helpers/policy_form.helpers';
import { DEFAULT_POLICY_SCHEDULE } from '../../public/app/constants';

const { setup } = pageHelpers.policyAdd;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

jest.mock('ui/new_platform');

const POLICY_NAME = 'my_policy';
const SNAPSHOT_NAME = 'my_snapshot';
const MIN_COUNT = '5';
const MAX_COUNT = '10';
const EXPIRE_AFTER_VALUE = '30';
const repository = fixtures.getRepository({ name: `a${getRandomString()}`, type: 'fs' });

describe('<PolicyAdd />', () => {
  let testBed: PolicyFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [repository] });
      httpRequestsMockHelpers.setLoadIndicesResponse({ indices: ['my_index'] });

      testBed = await setup();
      await nextTick();
      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create policy');
    });

    test('should not let the user go to the next step if required fields are missing', () => {
      const { find } = testBed;

      expect(find('nextButton').props().disabled).toBe(true);
    });

    describe('form validation', () => {
      describe('logistics (step 1)', () => {
        test('should require a policy name', async () => {
          const { form, find } = testBed;

          form.setInputValue('nameInput', '');
          find('nameInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual(['Policy name is required.']);
        });

        test('should require a snapshot name', () => {
          const { form, find } = testBed;

          form.setInputValue('snapshotNameInput', '');
          find('snapshotNameInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual(['Snapshot name is required.']);
        });

        it('should require a schedule', () => {
          const { form, find } = testBed;

          find('showAdvancedCronLink').simulate('click');
          form.setInputValue('advancedCronInput', '');
          find('advancedCronInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual(['Schedule is required.']);
        });
      });

      describe('snapshot settings (step 2)', () => {
        beforeEach(() => {
          const { form, actions } = testBed;
          // Complete step 1
          form.setInputValue('nameInput', POLICY_NAME);
          form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
          actions.clickNextButton();
        });

        test('should require at least one index', async () => {
          const { find, form, component } = testBed;

          await act(async () => {
            // Toggle "All indices" switch
            form.toggleEuiSwitch('allIndicesToggle', false);
            await nextTick();
            component.update();
          });

          // Deselect all indices from list
          find('deselectIndicesLink').simulate('click');

          expect(form.getErrorsMessages()).toEqual(['You must select at least one index.']);
        });
      });

      describe('retention (step 3)', () => {
        beforeEach(() => {
          const { form, actions } = testBed;
          // Complete step 1
          form.setInputValue('nameInput', POLICY_NAME);
          form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
          actions.clickNextButton();

          // Complete step 2
          actions.clickNextButton();
        });

        test('should not allow the minimum count be greater than the maximum count', () => {
          const { find, form } = testBed;

          form.setInputValue('minCountInput', MAX_COUNT + 1);
          find('minCountInput').simulate('blur');

          form.setInputValue('maxCountInput', MAX_COUNT);
          find('maxCountInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([
            'Minimum count cannot be greater than maximum count.',
          ]);
        });

        test('should not allow negative values for the delete after, minimum and maximum counts', () => {
          const { find, form } = testBed;

          form.setInputValue('expireAfterValueInput', '-1');
          find('expireAfterValueInput').simulate('blur');

          form.setInputValue('minCountInput', '-1');
          find('minCountInput').simulate('blur');

          form.setInputValue('maxCountInput', '-1');
          find('maxCountInput').simulate('blur');

          expect(form.getErrorsMessages()).toEqual([
            'Delete after cannot be negative.',
            'Minimum count cannot be negative.',
            'Maximum count cannot be negative.',
          ]);
        });
      });
    });

    describe('form payload & api errors', () => {
      beforeEach(async () => {
        const { actions, form } = testBed;

        // Complete step 1
        form.setInputValue('nameInput', POLICY_NAME);
        form.setInputValue('snapshotNameInput', SNAPSHOT_NAME);
        actions.clickNextButton();

        // Complete step 2
        actions.clickNextButton();

        // Complete step 3
        form.setInputValue('expireAfterValueInput', EXPIRE_AFTER_VALUE);
        form.setInputValue('minCountInput', MIN_COUNT);
        form.setInputValue('maxCountInput', MAX_COUNT);
        actions.clickNextButton();
      });

      it('should send the correct payload', async () => {
        const { actions } = testBed;

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          config: {},
          isManagedPolicy: false,
          name: POLICY_NAME,
          repository: repository.name,
          retention: {
            expireAfterUnit: 'd', // default
            expireAfterValue: Number(EXPIRE_AFTER_VALUE),
            maxCount: Number(MAX_COUNT),
            minCount: Number(MIN_COUNT),
          },
          schedule: DEFAULT_POLICY_SCHEDULE,
          snapshotName: SNAPSHOT_NAME,
        };

        expect(JSON.parse(latestRequest.requestBody)).toEqual(expected);
      });

      it('should surface the API errors from the put HTTP request', async () => {
        const { component, actions, find, exists } = testBed;

        const error = {
          status: 409,
          error: 'Conflict',
          message: `There is already a policy with name '${POLICY_NAME}'`,
        };

        httpRequestsMockHelpers.setAddPolicyResponse(undefined, { body: error });

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
          component.update();
        });

        expect(exists('savePolicyApiError')).toBe(true);
        expect(find('savePolicyApiError').text()).toContain(error.message);
      });
    });
  });
});
