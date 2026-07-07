/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { setupEnvironment } from '../../helpers/setup_environment';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createWarmPhaseActions,
} from '../../helpers/actions/phases';
import {
  haveGlobalErrorCallout,
  havePhaseErrorCallout,
} from '../../helpers/actions/errors_actions';
import { createFormSetValueAction } from '../../helpers/actions/form_set_value_action';
import { createRolloverActions } from '../../helpers/actions/rollover_actions';
import { createTogglePhaseAction } from '../../helpers/actions/toggle_phase_action';
import { renderEditPolicy } from '../../helpers/render_edit_policy';

describe('<EditPolicy /> error indicators', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    setPolicyName: ReturnType<typeof createFormSetValueAction>;
    toggleSaveAsNewPolicy: () => void;
    savePolicy: () => void;
  } & ReturnType<typeof createRolloverActions> &
    ReturnType<typeof createHotPhaseActions> &
    ReturnType<typeof createWarmPhaseActions> &
    ReturnType<typeof createColdPhaseActions> &
    ReturnType<typeof createFrozenPhaseActions> &
    ReturnType<typeof createDeletePhaseActions>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    renderEditPolicy(httpSetup, {
      initialEntries: ['/policies/edit'],
    });

    await screen.findByTestId('savePolicyButton');

    actions = {
      togglePhase: createTogglePhaseAction(),
      setPolicyName: createFormSetValueAction('policyNameField'),
      savePolicy: () => fireEvent.click(screen.getByTestId('savePolicyButton')),
      toggleSaveAsNewPolicy: () => fireEvent.click(screen.getByTestId('saveAsNewSwitch')),
      ...createRolloverActions(),
      ...createHotPhaseActions(),
      ...createWarmPhaseActions(),
      ...createColdPhaseActions(),
      ...createFrozenPhaseActions(),
      ...createDeletePhaseActions(),
    };
  });
  test('shows phase error indicators correctly', async () => {
    // This test simulates a user configuring a policy phase by phase. The flow is the following:
    // 0. Start with policy with no validation issues present
    // 1. Configure hot, introducing a validation error
    // 2. Configure warm, introducing a validation error
    // 3. Configure cold, introducing a validation error
    // 4. Fix validation error in hot
    // 5. Fix validation error in warm
    // 6. Fix validation error in cold
    // We assert against each of these progressive states.

    // 0. No validation issues
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);

    // 1. Hot phase validation issue
    actions.hot.toggleForceMerge();
    await actions.hot.setForcemergeSegmentsCount('-22');
    expect(havePhaseErrorCallout('hot')).toBe(true);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);

    // 2. Warm phase validation issue
    await actions.togglePhase('warm');
    actions.warm.toggleForceMerge();
    await actions.warm.setForcemergeSegmentsCount('-22');
    expect(havePhaseErrorCallout('hot')).toBe(true);
    expect(havePhaseErrorCallout('warm')).toBe(true);
    expect(havePhaseErrorCallout('cold')).toBe(false);

    // 3. Cold phase validation issue
    await actions.togglePhase('cold');
    await actions.cold.setReplicas('-33');
    expect(havePhaseErrorCallout('hot')).toBe(true);
    expect(havePhaseErrorCallout('warm')).toBe(true);
    expect(havePhaseErrorCallout('cold')).toBe(true);

    // 4. Fix validation issue in hot
    await actions.hot.setForcemergeSegmentsCount('1');
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(true);
    expect(havePhaseErrorCallout('cold')).toBe(true);

    // 5. Fix validation issue in warm
    await actions.warm.setForcemergeSegmentsCount('1');
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(true);

    // 6. Fix validation issue in cold
    await actions.cold.setReplicas('1');
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);
  }, 15000);

  test('global error callout should show, after clicking the "Save" button, if there are any form errors', async () => {
    expect(haveGlobalErrorCallout()).toBe(false);
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);

    // For new policy, just set empty name and save to trigger validation error
    await actions.setPolicyName('');
    await actions.savePolicy();
    await waitFor(() => expect(haveGlobalErrorCallout()).toBe(true));

    expect(haveGlobalErrorCallout()).toBe(true);
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);
  });

  test('clears all error indicators if last erring field is unmounted', async () => {
    // Set a valid policy name first (required for new policy)
    await actions.setPolicyName('test-policy');

    await actions.togglePhase('cold');
    await actions.cold.setMinAgeValue('7');
    // introduce validation error
    await actions.cold.setSearchableSnapshot('');

    await actions.savePolicy();
    await waitFor(() => expect(haveGlobalErrorCallout()).toBe(true));

    expect(haveGlobalErrorCallout()).toBe(true);
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(true);

    // unmount the field
    await actions.cold.toggleSearchableSnapshot();

    expect(haveGlobalErrorCallout()).toBe(false);
    expect(havePhaseErrorCallout('hot')).toBe(false);
    expect(havePhaseErrorCallout('warm')).toBe(false);
    expect(havePhaseErrorCallout('cold')).toBe(false);
  }, 10000);
});
