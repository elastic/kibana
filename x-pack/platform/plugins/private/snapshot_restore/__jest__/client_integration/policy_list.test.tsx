/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import { getPolicy } from '../../test/fixtures';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { setupEnvironment } from './helpers/setup_environment';
import { renderHome } from './helpers/render_home';

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
  name: 'just_state',
  retention: { minCount: 1 },
  config: { includeGlobalState: true },
});

describe('<PolicyList />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(async () => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;

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
    renderHome(httpSetup, { initialEntries: ['/policies'] });
    await screen.findByTestId('policyTable');
  });

  describe('details flyout', () => {
    test('should show the detail flyout when clicking on a policy', async () => {
      expect(screen.queryByTestId('policyDetail')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText(POLICY_WITH_GLOBAL_STATE_AND_FEATURES.name));

      expect(await screen.findByTestId('policyDetail')).toBeInTheDocument();
    });

    test('should show feature states if include global state is enabled', async () => {
      // Assert against first result shown in the table, which should have includeGlobalState enabled
      fireEvent.click(screen.getByText(POLICY_WITH_GLOBAL_STATE_AND_FEATURES.name));
      await screen.findByTestId('policyDetail');

      expect(
        within(screen.getByTestId('includeGlobalState')).getByTestId('value')
      ).toHaveTextContent('Yes');
      expect(
        within(screen.getByTestId('policyFeatureStatesSummary')).getByTestId('featureStatesList')
      ).toHaveTextContent('kibana');

      // Close the flyout
      fireEvent.click(screen.getByTestId('srPolicyDetailsFlyoutCloseButton'));
      await waitFor(() => expect(screen.queryByTestId('policyDetail')).not.toBeInTheDocument());

      // Replace the get policy details api call with the payload of the second row which we're about to click
      httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITHOUT_GLOBAL_STATE.name, {
        policy: POLICY_WITHOUT_GLOBAL_STATE,
      });

      // Now we will assert against the second result of the table which shouldnt have includeGlobalState
      fireEvent.click(screen.getByText(POLICY_WITHOUT_GLOBAL_STATE.name));
      await screen.findByTestId('policyDetail');

      expect(
        within(screen.getByTestId('includeGlobalState')).getByTestId('value')
      ).toHaveTextContent('No');
      expect(
        within(screen.getByTestId('policyFeatureStatesSummary')).getByTestId('value')
      ).toHaveTextContent('No');

      // Close the flyout
      fireEvent.click(screen.getByTestId('srPolicyDetailsFlyoutCloseButton'));
      await waitFor(() => expect(screen.queryByTestId('policyDetail')).not.toBeInTheDocument());
    });

    test('When it only has include globalState summary should also mention that it includes all features', async () => {
      // Replace the get policy details api call with the payload of the second row which we're about to click
      httpRequestsMockHelpers.setGetPolicyResponse(POLICY_WITH_JUST_GLOBAL_STATE.name, {
        policy: POLICY_WITH_JUST_GLOBAL_STATE,
      });

      // Assert against third result shown in the table, which should have just includeGlobalState enabled
      fireEvent.click(screen.getByText(POLICY_WITH_JUST_GLOBAL_STATE.name));
      await screen.findByTestId('policyDetail');

      expect(
        within(screen.getByTestId('includeGlobalState')).getByTestId('value')
      ).toHaveTextContent('Yes');
      expect(
        within(screen.getByTestId('policyFeatureStatesSummary')).getByTestId('value')
      ).toHaveTextContent('All features');
    });
  });
});
