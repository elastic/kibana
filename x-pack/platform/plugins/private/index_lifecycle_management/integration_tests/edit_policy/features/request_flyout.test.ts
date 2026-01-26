/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import { createTogglePhaseAction } from '../../helpers/actions/toggle_phase_action';
import { createFormSetValueAction } from '../../helpers/actions/form_set_value_action';
import { createMinAgeActions } from '../../helpers/actions/min_age_actions';
import { getDefaultHotPhasePolicy } from '../constants';

const jsonSelector = 'policyRequestJson';
const openRequestFlyout = async () => {
  fireEvent.click(screen.getByTestId('requestButton'));
  await waitFor(() => {
    expect(
      screen.queryByTestId(jsonSelector) || screen.queryByTestId('policyRequestInvalidAlert')
    ).toBeInTheDocument();
  });
};
const closeRequestFlyout = () => {
  fireEvent.click(screen.getByTestId('policyRequestClose'));
};
const hasRequestJson = () => Boolean(screen.queryByTestId(jsonSelector));
const getRequestJson = () => screen.getByTestId(jsonSelector).textContent || '';
const hasInvalidPolicyAlert = () => Boolean(screen.queryByTestId('policyRequestInvalidAlert'));

describe('<EditPolicy /> request flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
  });

  describe('when editing an existing policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      renderEditPolicy(httpSetup);

      await screen.findByTestId('savePolicyButton');
    });

    test('renders a json in flyout for a default policy', async () => {
      await openRequestFlyout();

      const json = getRequestJson();
      const expected = `PUT _ilm/policy/my_policy\n${JSON.stringify(
        {
          policy: {
            phases: { ...getDefaultHotPhasePolicy().policy.phases },
          },
        },
        null,
        2
      )}`;
      expect(json).toBe(expected);
    });

    test('renders an error callout if policy form is invalid', async () => {
      const togglePhase = createTogglePhaseAction();
      const warmActions = createMinAgeActions('warm');

      // toggle warm phase but don't set phase timing to create an invalid policy
      await togglePhase('warm');
      await openRequestFlyout();
      expect(hasInvalidPolicyAlert()).toBe(true);
      expect(hasRequestJson()).toBe(false);
      closeRequestFlyout();

      // set phase timing to "fix" the invalid policy
      await warmActions.setMinAgeValue('10');
      await openRequestFlyout();
      expect(hasInvalidPolicyAlert()).toBe(false);
      expect(hasRequestJson()).toBe(true);
    });

    test('renders a json with default policy name when only policy name is missing', async () => {
      const toggleSaveAsNew = () => fireEvent.click(screen.getByTestId('saveAsNewSwitch'));
      const setPolicyName = createFormSetValueAction('policyNameField');

      // delete the name of the policy which is currently valid
      toggleSaveAsNew();
      await setPolicyName('');
      await openRequestFlyout();

      // the json still works, no "invalid policy" alert
      expect(hasInvalidPolicyAlert()).toBe(false);
      expect(hasRequestJson()).toBe(true);

      const json = getRequestJson();
      const expected = `PUT _ilm/policy/<policyName>\n${JSON.stringify(
        {
          policy: {
            phases: { ...getDefaultHotPhasePolicy().policy.phases },
          },
        },
        null,
        2
      )}`;
      expect(json).toBe(expected);
    });
  });

  describe('when creating a new policy', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['abc'] });
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      renderEditPolicy(httpSetup, {
        initialEntries: ['/policies/edit'],
      });

      await screen.findByTestId('savePolicyButton');
    });

    test('renders the correct json and name for a new policy', async () => {
      const setPolicyName = createFormSetValueAction('policyNameField');

      await openRequestFlyout();
      const newPolicyJson = {
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                  max_primary_shard_size: '50gb',
                },
                set_priority: {
                  priority: 100,
                },
              },
              min_age: '0ms',
            },
          },
        },
      };

      // the json renders the default <policyName> when no policy name is provided
      let json = getRequestJson();
      let expected = `PUT _ilm/policy/<policyName>\n${JSON.stringify(newPolicyJson, null, 2)}`;

      expect(json).toBe(expected);

      closeRequestFlyout();
      await setPolicyName('test_policy');

      await openRequestFlyout();

      // the json now renders the provided policy name
      json = getRequestJson();
      expected = `PUT _ilm/policy/test_policy\n${JSON.stringify(newPolicyJson, null, 2)}`;

      expect(json).toBe(expected);
    });
  });

  describe('when policy has _meta field', () => {
    let policyWithMetaField: ReturnType<typeof getDefaultHotPhasePolicy>;

    beforeEach(async () => {
      const defaultPolicy = getDefaultHotPhasePolicy();
      policyWithMetaField = {
        ...defaultPolicy,
        policy: {
          ...defaultPolicy.policy,
          _meta: {
            description: 'test meta description',
            someObject: {
              test: 'test',
            },
          },
        },
      };
      httpRequestsMockHelpers.setLoadPolicies([policyWithMetaField]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['abc'] });
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      renderEditPolicy(httpSetup);

      await screen.findByTestId('savePolicyButton');
    });

    test('renders _meta field', async () => {
      await openRequestFlyout();

      const json = getRequestJson();
      const expected = `PUT _ilm/policy/${policyWithMetaField.name}\n${JSON.stringify(
        {
          policy: {
            phases: { ...policyWithMetaField.policy.phases },
            _meta: { ...policyWithMetaField.policy._meta },
          },
        },
        null,
        2
      )}`;

      expect(json).toBe(expected);
    });
  });
});
