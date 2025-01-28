/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from './helpers';
import { getPolicy } from '../../test/fixtures';
import { setupPoliciesListPage, PoliciesListTestBed } from './helpers/policy_list.helpers';

const POLICY_WITH_GLOBAL_STATE_AND_FEATURES = getPolicy({
  name: 'with_state',
  retention: { minCount: 1 },
  config: { includeGlobalState: true, featureStates: ['kibana'] },
});
const POLICY_WITHOUT_GLOBAL_STATE = getPolicy({
  name: 'without_state',
  retention: { minCount: 1 },
  config: { includeGlobalState: false },
});

const POLICY_WITH_JUST_GLOBAL_STATE = getPolicy({
  name: 'without_state',
  retention: { minCount: 1 },
  config: { includeGlobalState: true },
});

describe('<PolicyList />', () => {
  let testBed: PoliciesListTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPoliciesResponse({
      policies: [
        POLICY_WITH_GLOBAL_STATE_AND_FEATURES,
        POLICY_WITHOUT_GLOBAL_STATE,
        POLICY_WITH_JUST_GLOBAL_STATE,
      ],
    });
    httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITH_GLOBAL_STATE_AND_FEATURES.name, {
      policy: POLICY_WITH_GLOBAL_STATE_AND_FEATURES,
    });

    testBed = await setupPoliciesListPage(httpSetup);

    testBed.component.update();
  });

  describe('details flyout', () => {
    test('should show the detail flyout when clicking on a policy', async () => {
      const { exists, actions } = testBed;

      expect(exists('policyDetail')).toBe(false);

      await actions.clickPolicyAt(0);

      expect(exists('policyDetail')).toBe(true);
    });

    test('should show feature states if include global state is enabled', async () => {
      const { find, actions } = testBed;

      // Assert against first result shown in the table, which should have includeGlobalState enabled
      await actions.clickPolicyAt(0);

      expect(find('includeGlobalState.value').text()).toEqual('Yes');
      expect(find('policyFeatureStatesSummary.featureStatesList').text()).toEqual('kibana');

      // Close the flyout
      find('srPolicyDetailsFlyoutCloseButton').simulate('click');

      // Replace the get policy details api call with the payload of the second row which we're about to click
      httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITHOUT_GLOBAL_STATE.name, {
        policy: POLICY_WITHOUT_GLOBAL_STATE,
      });

      // Now we will assert against the second result of the table which shouldnt have includeGlobalState
      await actions.clickPolicyAt(1);

      expect(find('includeGlobalState.value').text()).toEqual('No');
      expect(find('policyFeatureStatesSummary.value').text()).toEqual('No');

      // Close the flyout
      find('srPolicyDetailsFlyoutCloseButton').simulate('click');
    });

    test('When it only has include globalState summary should also mention that it includes all features', async () => {
      const { find, actions } = testBed;

      // Replace the get policy details api call with the payload of the second row which we're about to click
      httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITH_JUST_GLOBAL_STATE.name, {
        policy: POLICY_WITH_JUST_GLOBAL_STATE,
      });

      // Assert against third result shown in the table, which should have just includeGlobalState enabled
      await actions.clickPolicyAt(2);

      expect(find('includeGlobalState.value').text()).toEqual('Yes');
      expect(find('policyFeatureStatesSummary.value').text()).toEqual('All features');
    });
  });
});
