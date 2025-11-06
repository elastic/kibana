/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setup } from './rollover.helpers';

describe('<EditPolicy /> rollover', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  let actions: ReturnType<typeof setup>['actions'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
    httpRequestsMockHelpers.setDefaultResponses();

    ({ actions } = setup(httpSetup));

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  });

  test('shows forcemerge when rollover enabled', () => {
    expect(actions.hot.forceMergeExists()).toBeTruthy();
  });

  test('hides forcemerge when rollover is disabled', async () => {
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.forceMergeExists()).toBeFalsy();
  });

  test('shows shrink input when rollover enabled', () => {
    expect(actions.hot.shrinkExists()).toBeTruthy();
  });

  test('hides shrink input when rollover is disabled', async () => {
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.shrinkExists()).toBeFalsy();
  });

  test('shows readonly input when rollover enabled', () => {
    expect(actions.hot.readonlyExists()).toBeTruthy();
  });

  test('hides readonly input when rollover is disabled', async () => {
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    expect(actions.hot.readonlyExists()).toBeFalsy();
  });

  test('hides and disables searchable snapshot field', async () => {
    expect(actions.hot.searchableSnapshotsExists()).toBeTruthy();
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();
    await actions.togglePhase('cold');

    expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();
  });

  test('shows rollover tip on minimum age', async () => {
    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
    await actions.togglePhase('frozen');
    await actions.togglePhase('delete');

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeTruthy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeTruthy();
  });

  test('hiding rollover tip on minimum age', async () => {
    await actions.rollover.toggleDefault();
    await actions.rollover.toggle();

    await actions.togglePhase('warm');
    await actions.togglePhase('cold');
    await actions.togglePhase('frozen');
    await actions.togglePhase('delete');

    expect(actions.warm.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.cold.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.frozen.hasRolloverTipOnMinAge()).toBeFalsy();
    expect(actions.delete.hasRolloverTipOnMinAge()).toBeFalsy();
  });
});
