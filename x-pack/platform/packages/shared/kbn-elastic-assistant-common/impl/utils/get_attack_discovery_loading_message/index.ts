/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_END, DEFAULT_START } from '../../alerts/get_open_and_acknowledged_alerts_query';
import * as i18n from './translations';

export const getAttackDiscoveryLoadingMessage = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end?: string | null;
  start?: string | null;
}): string => {
  if (start === DEFAULT_START && end === DEFAULT_END) {
    return i18n.AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }

  if (end != null && start != null) {
    return i18n.AI_IS_CURRENTLY_ANALYZING_RANGE({ alertsCount, end, start });
  } else if (start != null) {
    return i18n.AI_IS_CURRENTLY_ANALYZING_FROM({ alertsCount, from: start });
  } else {
    return i18n.AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }
};
