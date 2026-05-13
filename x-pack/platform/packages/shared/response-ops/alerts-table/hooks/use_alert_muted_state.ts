/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, ALERT_MUTED } from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';

export const useAlertMutedState = (alert?: Alert) => {
  const alertInstanceId = alert && (alert[ALERT_INSTANCE_ID]?.[0] as string);
  const ruleId = alert && (alert[ALERT_RULE_UUID]?.[0] as string);
  const alertMutedValue = alert?.[ALERT_MUTED];
  const isMuted = Array.isArray(alertMutedValue) && alertMutedValue[0] === true;
  return useMemo(() => {
    return {
      isMuted,
      ruleId,
      alertInstanceId,
    };
  }, [alertInstanceId, isMuted, ruleId]);
};
