/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import type { ToolbarPopoverProps } from '../../../shared_components';
import { ToolbarPopover } from '../../../shared_components';
import type { MetricVisualizationState } from '../types';
import { MetricAppearanceSettings } from './appearance_settings';

interface AppearancePopoverProps {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
  groupPosition?: ToolbarPopoverProps['groupPosition'];
}

export function AppearanceSettingsPopover({
  state,
  setState,
  groupPosition,
}: AppearancePopoverProps) {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.metric.appearancePopover.title', {
        defaultMessage: 'Appearance',
      })}
      type="visualOptions"
      groupPosition={groupPosition}
      buttonDataTestSubj="lnsTextOptionsButton"
    >
      <MetricAppearanceSettings state={state} setState={setState} />
    </ToolbarPopover>
  );
}
