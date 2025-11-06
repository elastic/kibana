/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import { createTogglePhaseAction } from '../../helpers';
import { initTestBed } from '../init_test_bed';
import type { InitTestBed } from '../init_test_bed';
import type { Phase } from '../../../common/types';

export interface TimelineTestBed extends InitTestBed {
  actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    timeline: {
      hasPhase: (phase: Phase) => boolean;
    };
  };
}

export const setupTimelineTestBed = (httpSetup: HttpSetup): TimelineTestBed => {
  const renderResult = initTestBed(httpSetup);

  return {
    ...renderResult,
    actions: {
      togglePhase: createTogglePhaseAction(),
      timeline: {
        hasPhase: (phase: Phase) => Boolean(screen.queryByTestId(`ilmTimelinePhase-${phase}`)),
      },
    },
  };
};
