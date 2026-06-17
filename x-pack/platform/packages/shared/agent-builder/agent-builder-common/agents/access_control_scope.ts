/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export enum AgentAccessControlScope {
  Private = 'private',
  Public = 'public',
  Shared = 'shared',
}

/** Map from agent access-control scope to the icon used in the UI. */
export const ACCESS_CONTROL_SCOPE_ICON: Record<AgentAccessControlScope, EuiIconType> = {
  [AgentAccessControlScope.Public]: 'globe',
  [AgentAccessControlScope.Shared]: 'users',
  [AgentAccessControlScope.Private]: 'lock',
};

export const ACCESS_CONTROL_SCOPE_BADGE_COLOR: Record<
  AgentAccessControlScope,
  EuiBadgeProps['color']
> = {
  [AgentAccessControlScope.Private]: 'hollow',
  [AgentAccessControlScope.Shared]: 'primary',
  [AgentAccessControlScope.Public]: 'success',
};
