/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import { createTogglePhaseAction } from '../../helpers/actions/toggle_phase_action';
import type { PhaseWithTiming } from '../../../common/types';

describe('<EditPolicy /> timing', () => {
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
    httpRequestsMockHelpers.setDefaultResponses();
  });

  afterEach(() => {});

  test.each<PhaseWithTiming>(['warm', 'cold', 'frozen', 'delete'])(
    'timing is only shown when %s phase is enabled',
    async (phase) => {
      // Render component
      renderEditPolicy(httpSetup);

      await screen.findByTestId('savePolicyButton');

      // Initially, minAge input should not be visible (phase is disabled)
      expect(screen.queryByTestId(`${phase}-selectedMinimumAge`)).not.toBeInTheDocument();

      // Enable the phase
      const togglePhase = createTogglePhaseAction();
      await togglePhase(phase);

      // After enabling, minAge input should be visible
      expect(screen.getByTestId(`${phase}-selectedMinimumAge`)).toBeInTheDocument();
    }
  );
});
