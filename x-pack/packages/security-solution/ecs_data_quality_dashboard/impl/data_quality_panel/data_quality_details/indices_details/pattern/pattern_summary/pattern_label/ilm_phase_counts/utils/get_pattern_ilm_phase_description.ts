/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

export const getPatternIlmPhaseDescription = ({
  indices,
  pattern,
  phase,
}: {
  indices: number;
  pattern: string;
  phase: string;
}): string => {
  switch (phase) {
    case 'hot':
      return i18n.HOT_PATTERN_TOOLTIP({ indices, pattern });
    case 'warm':
      return i18n.WARM_PATTERN_TOOLTIP({ indices, pattern });
    case 'cold':
      return i18n.COLD_PATTERN_TOOLTIP({ indices, pattern });
    case 'frozen':
      return i18n.FROZEN_PATTERN_TOOLTIP({ indices, pattern });
    case 'unmanaged':
      return i18n.UNMANAGED_PATTERN_TOOLTIP({ indices, pattern });
    default:
      return '';
  }
};
