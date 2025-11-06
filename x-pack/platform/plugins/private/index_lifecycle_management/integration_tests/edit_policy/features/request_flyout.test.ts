/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupRequestFlyoutTestBed } from './request_flyout.helpers';
import { getDefaultHotPhasePolicy } from '../constants';

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
    let actions: ReturnType<typeof setupRequestFlyoutTestBed>['actions'];

    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();
      ({ actions } = setupRequestFlyoutTestBed(httpSetup));

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('renders a json in flyout for a default policy', async () => {
      await actions.openRequestFlyout();

      const json = actions.getRequestJson();
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
      // toggle warm phase but don't set phase timing to create an invalid policy
      await actions.togglePhase('warm');
      await actions.openRequestFlyout();
      expect(actions.hasInvalidPolicyAlert()).toBe(true);
      expect(actions.hasRequestJson()).toBe(false);
      await actions.closeRequestFlyout();

      // set phase timing to "fix" the invalid policy
      await actions.warm.setMinAgeValue('10');
      await actions.openRequestFlyout();
      expect(actions.hasInvalidPolicyAlert()).toBe(false);
      expect(actions.hasRequestJson()).toBe(true);
    });

    test('renders a json with default policy name when only policy name is missing', async () => {
      // delete the name of the the policy which is currently valid
      await actions.toggleSaveAsNewPolicy();
      await actions.setPolicyName('');
      await actions.openRequestFlyout();

      // the json still works, no "invalid policy" alert
      expect(actions.hasInvalidPolicyAlert()).toBe(false);
      expect(actions.hasRequestJson()).toBe(true);

      const json = actions.getRequestJson();
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
    let actions: ReturnType<typeof setupRequestFlyoutTestBed>['actions'];

    beforeEach(async () => {
      // Don't load any existing policies for new policy tests
      httpRequestsMockHelpers.setLoadPolicies([]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['abc'] });
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      ({ actions } = setupRequestFlyoutTestBed(httpSetup, true));

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('renders the correct json and name for a new policy', async () => {
      await actions.openRequestFlyout();
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
      let json = actions.getRequestJson();
      let expected = `PUT _ilm/policy/<policyName>\n${JSON.stringify(newPolicyJson, null, 2)}`;

      expect(json).toBe(expected);

      await actions.closeRequestFlyout();
      await actions.setPolicyName('test_policy');

      await actions.openRequestFlyout();

      // the json now renders the provided policy name
      json = actions.getRequestJson();
      expected = `PUT _ilm/policy/test_policy\n${JSON.stringify(newPolicyJson, null, 2)}`;

      expect(json).toBe(expected);
    });
  });

  describe('when policy has _meta field', () => {
    let actions: ReturnType<typeof setupRequestFlyoutTestBed>['actions'];
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
      ({ actions } = setupRequestFlyoutTestBed(httpSetup));

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('renders _meta field', async () => {
      await actions.openRequestFlyout();

      const json = actions.getRequestJson();
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
