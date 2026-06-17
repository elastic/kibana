/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { type Moment } from 'moment';

export interface GetLogRateAnalysisParametersFromAlertArgs {
  alertStartedAt: string;
  alertEndedAt?: string;
  timeSize?: number;
  timeUnit?: string;
}

export const getLogRateAnalysisParametersFromAlert = ({
  alertStartedAt,
  alertEndedAt,
  timeSize,
  timeUnit,
}: GetLogRateAnalysisParametersFromAlertArgs) => {
  const intervalFactor = getIntervalFactor(timeSize, timeUnit);

  const alertStart = moment(alertStartedAt);
  const alertEnd = alertEndedAt ? moment(alertEndedAt) : undefined;

  const helperArgs = { alertStart, alertEnd, intervalFactor };

  const timeRange = {
    min: alertStart.clone().subtract(15 * intervalFactor, 'minutes'),
    max: getTimeRangeEnd(helperArgs),
  };

  return {
    timeRange,
    windowParameters: getWindowParameters(helperArgs),
  };
};

// Identify `intervalFactor` to adjust time ranges based on alert settings.
// The default time ranges for `initialAnalysisStart` are suitable for a `1m` lookback.
// If an alert would have a `5m` lookback, this would result in a factor of `5`.
export const getIntervalFactor = (timeSize?: number, timeUnit?: string) => {
  const lookbackDuration =
    timeSize && timeUnit
      ? moment.duration(
          timeSize,
          // workaround to cast the string based time unit to moment's format.
          timeUnit as unknown as moment.unitOfTime.DurationConstructor | undefined
        )
      : moment.duration(1, 'm');
  return Math.max(1, lookbackDuration.asSeconds() / 60);
};

interface GetParameterHelperArgs {
  alertStart: Moment;
  intervalFactor: number;
  alertEnd?: Moment;
}

function getTimeRangeEnd({ alertStart, alertEnd, intervalFactor }: GetParameterHelperArgs) {
  if (alertEnd) {
    if (
      alertStart
        .clone()
        .add(15 * intervalFactor, 'minutes')
        .isAfter(alertEnd)
    )
      return alertEnd.clone().add(1 * intervalFactor, 'minutes');
    else {
      return alertStart.clone().add(15 * intervalFactor, 'minutes');
    }
  } else if (
    alertStart
      .clone()
      .add(15 * intervalFactor, 'minutes')
      .isAfter(moment(new Date()))
  ) {
    return moment(new Date());
  } else {
    return alertStart.clone().add(15 * intervalFactor, 'minutes');
  }
}

function getDeviationMax({ alertStart, alertEnd, intervalFactor }: GetParameterHelperArgs) {
  if (alertEnd) {
    if (
      alertStart
        .clone()
        .add(10 * intervalFactor, 'minutes')
        .isAfter(alertEnd)
    )
      return alertEnd
        .clone()
        .subtract(1 * intervalFactor, 'minutes')
        .valueOf();
    else {
      return alertStart
        .clone()
        .add(10 * intervalFactor, 'minutes')
        .valueOf();
    }
  } else if (
    alertStart
      .clone()
      .add(10 * intervalFactor, 'minutes')
      .isAfter(moment(new Date()))
  ) {
    return moment(new Date()).valueOf();
  } else {
    return alertStart
      .clone()
      .add(10 * intervalFactor, 'minutes')
      .valueOf();
  }
}

function getWindowParameters(args: GetParameterHelperArgs) {
  const { alertStart, intervalFactor } = args;
  return {
    baselineMin: alertStart
      .clone()
      .subtract(13 * intervalFactor, 'minutes')
      .valueOf(),
    baselineMax: alertStart
      .clone()
      .subtract(2 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMin: alertStart
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMax: getDeviationMax(args),
  };
}
