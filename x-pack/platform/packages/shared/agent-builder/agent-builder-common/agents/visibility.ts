/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';

export enum AgentVisibility {
  Private = 'private',
  Public = 'public',
  Shared = 'shared',
}

/**
 * Icon type used in the UI for each visibility level.
 * Use with EuiIcon type prop.
 */
export enum AgentVisibilityIcon {
  Globe = 'globe',
  Users = 'users',
  Lock = 'lock',
}

/** Map from agent visibility to the icon used in the UI. */
export const VISIBILITY_ICON: Record<AgentVisibility, AgentVisibilityIcon> = {
  [AgentVisibility.Public]: AgentVisibilityIcon.Globe,
  [AgentVisibility.Shared]: AgentVisibilityIcon.Users,
  [AgentVisibility.Private]: AgentVisibilityIcon.Lock,
};

export const VISIBILITY_BADGE_COLOR: Record<AgentVisibility, EuiBadgeProps['color']> = {
  [AgentVisibility.Private]: 'hollow',
  [AgentVisibility.Shared]: 'primary',
  [AgentVisibility.Public]: 'default',
};
