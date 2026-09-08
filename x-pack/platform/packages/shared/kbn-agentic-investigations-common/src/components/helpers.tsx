/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IconType, type EuiButtonEmptyProps } from '@elastic/eui';
import type { RecommendedAction, Investigation } from '@kbn/pnd-common';

export const getEmptyValue = () => '—';

const ACTION_ICONS_MAP: Record<RecommendedAction, IconType> = {
  contain: 'lock',
  investigate: 'external',
  tune: 'gear',
  escalate: 'lock',
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
  if (investigation.recommendedAction === 'contain' && investigation.severity === 'high') {
    return { type: 'cross', color: 'danger' };
  }
  return {
    type: ACTION_ICONS_MAP[investigation.recommendedAction],
    color: ['investigate', 'tune'].includes(investigation.recommendedAction) ? 'primary' : 'danger',
  };
};
