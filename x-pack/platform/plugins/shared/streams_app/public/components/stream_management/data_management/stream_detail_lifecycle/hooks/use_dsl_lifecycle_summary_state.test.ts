/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dslLifecycleSummaryUiReducer,
  initialDslLifecycleSummaryUiState,
} from './use_dsl_lifecycle_summary_state';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';

describe('dslLifecycleSummaryUiReducer', () => {
  it('clears pending flyout save when closing the override modal', () => {
    const pending: IngestStreamLifecycleDSL = {
      dsl: { data_retention: '30d', downsample: [{ after: '1d', fixed_interval: '1h' }] },
    };

    const state = {
      ...initialDslLifecycleSummaryUiState,
      overrideSettingsContext: { type: 'editDownsampleSteps' as const },
      pendingEditFlyoutSave: pending,
    };

    const next = dslLifecycleSummaryUiReducer(state, { type: 'closeOverrideModal' });

    expect(next.overrideSettingsContext).toBeNull();
    expect(next.pendingEditFlyoutSave).toBeNull();
  });

  it('opens the edit flyout with initial steps and selected index', () => {
    const initialSteps: IngestStreamLifecycleDSL = {
      dsl: { data_retention: '30d', downsample: [{ after: '1d', fixed_interval: '1h' }] },
    };

    const next = dslLifecycleSummaryUiReducer(initialDslLifecycleSummaryUiState, {
      type: 'openEditFlyout',
      payload: { initialSteps, selectedStepIndex: 0 },
    });

    expect(next.isEditDslStepsFlyoutOpen).toBe(true);
    expect(next.editFlyoutInitialSteps).toBe(initialSteps);
    expect(next.selectedStepIndex).toBe(0);
    expect(next.pendingEditFlyoutSave).toBeNull();
  });
});
