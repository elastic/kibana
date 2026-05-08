/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export enum AgentVisibility {
  Private = 'private',
  Public = 'public',
  Shared = 'shared',
}

/** Map from agent visibility to the icon used in the UI. */
export const VISIBILITY_ICON: Record<AgentVisibility, EuiIconType> = {
  [AgentVisibility.Public]: 'globe',
  [AgentVisibility.Shared]: 'users',
  [AgentVisibility.Private]: 'lock',
};

export const VISIBILITY_BADGE_COLOR: Record<AgentVisibility, EuiBadgeProps['color']> = {
  [AgentVisibility.Private]: 'hollow',
  [AgentVisibility.Shared]: 'primary',
  [AgentVisibility.Public]: 'success',
};
