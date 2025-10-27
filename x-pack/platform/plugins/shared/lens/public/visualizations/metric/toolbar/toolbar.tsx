/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { AppearanceSettingsPopover } from './appearance_settings_popover';
import type { MetricVisualizationState } from '../types';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

export function Toolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const { state, setState } = props;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <AppearanceSettingsPopover state={state} setState={setState} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
