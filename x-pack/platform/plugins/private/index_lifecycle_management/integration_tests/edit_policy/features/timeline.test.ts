/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupTimelineTestBed } from './timeline.helpers';

describe('<EditPolicy /> timeline', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let actions: ReturnType<typeof setupTimelineTestBed>['actions'];

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

    ({ actions } = setupTimelineTestBed(httpSetup));

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  });

  test('showing all phases on the timeline', async () => {
    // This is how the default policy should look
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(false);
    expect(actions.timeline.hasPhase('cold')).toBe(false);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('warm');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(false);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('cold');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(true);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('delete');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(true);
    expect(actions.timeline.hasPhase('delete')).toBe(true);
  });
});
