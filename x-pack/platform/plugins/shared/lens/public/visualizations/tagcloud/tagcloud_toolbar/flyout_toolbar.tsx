/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ToolbarContentMap } from '../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../shared_components/flyout_toolbar';
import type { VisualizationToolbarProps } from '../../../types';
import type { TagcloudState } from '../types';
import { TagcloudAppearanceSettings } from './appearance_settings';

export function TagcloudFlyoutToolbar(props: VisualizationToolbarProps<TagcloudState>) {
  const flyoutToolbarContentMap: ToolbarContentMap<TagcloudState> = {
    style: TagcloudAppearanceSettings,
  };
  return <FlyoutToolbar {...props} contentMap={flyoutToolbarContentMap} />;
}
