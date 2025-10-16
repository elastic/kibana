/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ToolbarContentMap } from '../../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../../shared_components/flyout_toolbar';

import type { VisualizationToolbarProps } from '../../../../types';
import type { DatatableVisualizationState } from '../../visualization';

import { DatatableAppearanceSettings } from './appearance_settings';

export function DatatableFlyoutToolbar(
  props: VisualizationToolbarProps<DatatableVisualizationState>
) {
  const datatableToolbarContentMap: ToolbarContentMap<DatatableVisualizationState> = {
    style: DatatableAppearanceSettings,
  };
  return <FlyoutToolbar {...props} contentMap={datatableToolbarContentMap} />;
}
