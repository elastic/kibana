/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupRequestFlyoutTestBed, RequestFlyoutTestBed } from './request_flyout.helpers';
import { getDefaultHotPhasePolicy } from '../constants';

describe('<EditPolicy /> request flyout', () => {
  let testBed: RequestFlyoutTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupRequestFlyoutTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  test('renders a json in flyout for a default policy', async () => {
    const { actions } = testBed;
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
    const { actions } = testBed;
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
    const { actions } = testBed;
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

  test('renders the correct json and name for a new policy', async () => {
    await act(async () => {
      testBed = await setupRequestFlyoutTestBed(httpSetup, true);
    });

    const { component, actions } = testBed;
    component.update();

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

  test('renders _meta field', async () => {
    const defaultPolicy = getDefaultHotPhasePolicy();
    const policyWithMetaField = {
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

    await act(async () => {
      testBed = await setupRequestFlyoutTestBed(httpSetup);
    });

    const { component, actions } = testBed;
    component.update();

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
