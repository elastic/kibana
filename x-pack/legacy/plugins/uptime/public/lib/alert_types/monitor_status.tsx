/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import DateMath from '@elastic/datemath';
import {
  AlertTypeModel,
  ValidationResult,
} from '../../../../../../plugins/triggers_actions_ui/public/types';
import { AlertMonitorStatus } from '../../components/connected';

export const initMonitorStatusAlertType = (autocomplete: any): AlertTypeModel => ({
  id: 'xpack.uptime.alerts.downMonitor',
  name: 'Uptime Monitor Status',
  iconClass: 'uptimeApp',
  alertParamsExpression: params => {
    return <AlertMonitorStatus {...params} autocomplete={autocomplete} />;
  },
  validate: (alertParams: any): ValidationResult => {
    const errors: Record<string, any> = {};
    const timerange = alertParams?.timerange;
    if (!timerange) {
      errors.noTimeRange = 'No time range specified';
    }
    if (!timerange.start) {
      errors.noTimeRangeStart = 'Specified time range has no start time';
    }
    if (!timerange.end) {
      errors.noTimeRangeEnd = 'Specified time range has no end time';
    }
    if (
      (DateMath.parse(timerange.start)?.valueOf() ?? 0) >
      (DateMath.parse(timerange.end)?.valueOf() ?? 1)
    ) {
      errors.invalidTimeRange = 'Time range start cannot exceed time range end';
    }
    const { numTimes } = alertParams;
    if (!numTimes || isNaN(numTimes) || numTimes < 1) {
      errors.invalidNumTimes = 'Number of alert check down times must be an integer greater than 0';
    }
    return { errors };
  },
  defaultActionMessage: 'Monitor [{{ctx.metadata.name}}] is down',
});
