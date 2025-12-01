/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DatatableVisualizationState } from '@kbn/lens-common';
import { DatatableAppearanceSettings } from './appearance_settings';
import { PivotSettings } from './pivot_settings';

interface TableSettingsProps {
  state: DatatableVisualizationState;
  setState: (newState: DatatableVisualizationState) => void;
}

/**
 * Combined settings component that shows both appearance and pivot settings
 */
export function TableSettings({ state, setState }: TableSettingsProps) {
  const isPivotMode = state.columns.some((c) => c.isTransposed || c.transposeDimension === 'columns');

  return (
    <div>
      <DatatableAppearanceSettings state={state} setState={setState} />
      {isPivotMode && (
        <>
          <EuiSpacer size="l" />
          <PivotSettings state={state} setState={setState} />
        </>
      )}
    </div>
  );
}
