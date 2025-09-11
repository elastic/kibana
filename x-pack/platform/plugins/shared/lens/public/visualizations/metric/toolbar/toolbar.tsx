/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VisualizationToolbarProps } from '../../../types';
import { AppearancePopover } from './appearance_popover';
import type { MetricVisualizationState } from '../types';

export function Toolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const { state, setState } = props;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <AppearancePopover state={state} setState={setState} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
