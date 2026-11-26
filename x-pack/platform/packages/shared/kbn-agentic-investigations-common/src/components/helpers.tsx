/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IconType, type EuiButtonEmptyProps } from '@elastic/eui';
import type { RecommendedAction, Investigation } from '../types';

export const getEmptyValue = () => '—';

const ACTION_ICONS_MAP: Record<RecommendedAction, IconType> = {
  respond: 'lock',
  investigate: 'external',
  configure: 'gear',
  closed: 'check',
};

const PRIMARY_COLOR_ACTIONS: RecommendedAction[] = ['investigate', 'configure'];

/**
 * A decision has already been made on this investigation, so the actions that would
 * make one — approve, assign, dismiss — no longer apply. Read-only actions still do.
 */
export const isDecided = (investigation: Investigation): boolean =>
  investigation.recommendedAction === 'closed';

export const getActionButtonIconProps = (
  investigation: Investigation
): {
  type: IconType;
  color: EuiButtonEmptyProps['color'];
} => {
  if (!investigation.recommendedAction) {
    return { type: 'flag', color: 'warning' };
  }
  if (investigation.recommendedAction === 'closed') {
    return { type: 'check', color: 'success' };
  }
  if (investigation.recommendedAction === 'respond' && investigation.severity === 'high') {
    return { type: 'cross', color: 'danger' };
  }
  return {
    type: ACTION_ICONS_MAP[investigation.recommendedAction],
    color: PRIMARY_COLOR_ACTIONS.includes(investigation.recommendedAction) ? 'primary' : 'danger',
  };
};
