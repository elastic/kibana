/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STACK_ALERTS_ONLY_FEATURE_ID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Returns whether the current user can modify Stack alerts (acknowledge, mark as
 * untracked, mute/unmute, edit tags).
 *
 * This reflects the `write` UI capability granted by the `stackAlertsOnly: all`
 * privilege. The underlying RAC `alert:all` / `rule:mute_alerts` privileges are not
 * exposed as browser capabilities, so the feature declares an explicit `write` UI
 * capability that we read here.
 */
export const useCanModifyAlerts = (): boolean => {
  const { capabilities } = useKibana().services.application;
  return Boolean(capabilities[STACK_ALERTS_ONLY_FEATURE_ID]?.write);
};
