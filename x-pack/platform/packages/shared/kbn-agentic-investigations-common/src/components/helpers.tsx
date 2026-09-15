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
    // Use typed array so a stale literal becomes a compile error rather than
    // silently turning every non-matching bucket's card button red.
    color: (['investigate', 'configure'] as RecommendedAction[]).includes(
      investigation.recommendedAction
    )
      ? 'primary'
      : 'danger',
  };
};
