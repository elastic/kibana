/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { VisualizationToolbarProps } from '../../../types';
import type { ToolbarContentMap } from '../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../shared_components/flyout_toolbar';
import { MetricAppearanceSettings } from './appearance_settings';
import type { MetricVisualizationState } from '../types';

export function MetricFlyoutToolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const metricToolbarContentMap: ToolbarContentMap<MetricVisualizationState> = {
    style: MetricAppearanceSettings,
  };
  return <FlyoutToolbar {...props} contentMap={metricToolbarContentMap} />;
}
