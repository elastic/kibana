/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setup } from './timing.helpers';
import type { PhaseWithTiming } from '../../../common/types';

describe('<EditPolicy /> timing', () => {
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

  ['warm', 'cold', 'frozen', 'delete'].forEach((phase: string) => {
    test(`timing is only shown when ${phase} phase is enabled`, async () => {
      const phaseWithTiming = phase as PhaseWithTiming;
      expect(actions[phaseWithTiming].hasMinAgeInput()).toBeFalsy();
      await actions.togglePhase(phaseWithTiming);
      expect(actions[phaseWithTiming].hasMinAgeInput()).toBeTruthy();
    });
  });
});
