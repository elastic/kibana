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

describe('<EditPolicy /> timeline', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

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

    renderEditPolicy(httpSetup);

    await screen.findByTestId('savePolicyButton');
  });

  test('showing all phases on the timeline', async () => {
    const togglePhase = createTogglePhaseAction();

    // This is how the default policy should look
    expect(screen.getByTestId('ilmTimelinePhase-hot')).toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-warm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-cold')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-delete')).not.toBeInTheDocument();

    await togglePhase('warm');
    expect(screen.getByTestId('ilmTimelinePhase-hot')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-warm')).toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-cold')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-delete')).not.toBeInTheDocument();

    await togglePhase('cold');
    expect(screen.getByTestId('ilmTimelinePhase-hot')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-warm')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-cold')).toBeInTheDocument();
    expect(screen.queryByTestId('ilmTimelinePhase-delete')).not.toBeInTheDocument();

    await togglePhase('delete');
    expect(screen.getByTestId('ilmTimelinePhase-hot')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-warm')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-cold')).toBeInTheDocument();
    expect(screen.getByTestId('ilmTimelinePhase-delete')).toBeInTheDocument();
  });
});
