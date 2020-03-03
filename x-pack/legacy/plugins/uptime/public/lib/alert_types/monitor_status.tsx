/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import React from 'react';
import DateMath from '@elastic/datemath';
import { isRight } from 'fp-ts/lib/Either';
import {
  AlertTypeModel,
  ValidationResult,
  // TODO: this typing issue should be resolved after NP migration
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/triggers_actions_ui/public/types';
import { AlertMonitorStatus } from '../../components/connected';
import { AlertTypeInitializer } from '.';
import { StatusCheckExecutorParamsType } from '../../../common/runtime_types';

/**
 * Check if params have properties.
 * @param params the alert params
 */
const hasProps = (params: any): boolean => {
  for (const p in params) {
    if (Object.prototype.hasOwnProperty.call(params, p)) {
      return true;
    }
  }
  return false;
};

export const validate = (alertParams: any): ValidationResult => {
  const errors: Record<string, any> = {};
  const decoded = StatusCheckExecutorParamsType.decode(alertParams);

  /*
   * When the UI initially loads, this validate function is called with an
   * empty set of params, we don't want to type check against that.
   */
  if (hasProps(alertParams) && !isRight(decoded)) {
    errors.typeCheckFailure = 'Provided parameters do not conform to the expected type.';
    ThrowReporter.report(decoded);
  }

  if (isRight(decoded)) {
    const { numTimes, timerange } = decoded.right;
    const from = timerange?.from;
    const mFrom = DateMath.parse(from);
    const to = timerange?.to;
    const mTo = DateMath.parse(to);
    if (!from) {
      errors.noTimeRangeStart = 'Specified time range has no start time';
    } else if (isNaN(mFrom?.valueOf() ?? 0)) {
      errors.timeRangeStartValueNaN = 'Specified time range start is invalid';
    }

    if (!to) {
      errors.noTimeRangeEnd = 'Specified time range has no end time';
    } else if (isNaN(mTo?.valueOf() ?? 0)) {
      errors.timeRangeEndValueNaN = 'Specified time range end is invalid';
    }

    // the default values for this test will pass, we only want to specify an error
    // in the case that `from` is more recent than `to`
    if ((mFrom?.valueOf() ?? 0) > (mTo?.valueOf() ?? 1)) {
      errors.invalidTimeRange = 'Time range start cannot exceed time range end';
    }

    if (!numTimes || isNaN(numTimes) || numTimes < 1) {
      errors.invalidNumTimes = 'Number of alert check down times must be an integer greater than 0';
    }
  }

  return { errors };
};

export const initMonitorStatusAlertType: AlertTypeInitializer = ({
  autocomplete,
}): AlertTypeModel => ({
  id: 'xpack.uptime.alerts.downMonitor',
  name: 'Uptime Monitor Status',
  iconClass: 'uptimeApp',
  alertParamsExpression: params => {
    return <AlertMonitorStatus {...params} autocomplete={autocomplete} />;
  },
  validate,
  defaultActionMessage: 'Monitor [{{ctx.metadata.name}}] is down',
});
