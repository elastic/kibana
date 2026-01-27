/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FAILED_AUTO_FILL_ATTEMPTS_FIELD = `kibana.alert.rule.gap.failed_auto_fill_attempts`;

const getFilterForInterval = (hasInterval: boolean | undefined, field: string) => {
  if (hasInterval === undefined) {
    return null;
  }
  const fieldFilter = `kibana.alert.rule.gap.${field}: *`;
  return hasInterval ? fieldFilter : `NOT ${fieldFilter}`;
};

export const buildGapsFilter = ({
  start,
  end,
  statuses,
  hasUnfilledIntervals,
  hasInProgressIntervals,
  hasFilledIntervals,
  updatedBefore,
  failedAutoFillAttemptsLessThan,
}: {
  start?: string;
  end?: string;
  statuses?: string[];
  hasUnfilledIntervals?: boolean;
  hasInProgressIntervals?: boolean;
  hasFilledIntervals?: boolean;
  updatedBefore?: string;
  failedAutoFillAttemptsLessThan?: number;
}) => {
  const baseFilter =
    'event.action: gap AND event.provider: alerting AND not kibana.alert.rule.gap.deleted:true';

  const endFilter = end ? `kibana.alert.rule.gap.range <= "${end}"` : null;
  const startFilter = start ? `kibana.alert.rule.gap.range >= "${start}"` : null;

  const statusesFilter = statuses?.length
    ? `(${statuses.map((status) => `kibana.alert.rule.gap.status : ${status}`).join(' OR ')})`
    : null;

  const hasUnfilledIntervalsFilter = getFilterForInterval(
    hasUnfilledIntervals,
    'unfilled_intervals'
  );
  const hasInProgressIntervalsFilter = getFilterForInterval(
    hasInProgressIntervals,
    'in_progress_intervals'
  );
  const hasFilledIntervalsFilter = getFilterForInterval(hasFilledIntervals, 'filled_intervals');

  const updatedBeforeFilter = updatedBefore
    ? `kibana.alert.rule.gap.updated_at < "${updatedBefore}"`
    : null;

  const failedAutoAttemptsLessThanFilter = failedAutoFillAttemptsLessThan
    ? `(NOT ${FAILED_AUTO_FILL_ATTEMPTS_FIELD}:* OR ${FAILED_AUTO_FILL_ATTEMPTS_FIELD}:*  AND ${FAILED_AUTO_FILL_ATTEMPTS_FIELD} < ${failedAutoFillAttemptsLessThan})`
    : null;

  return [
    baseFilter,
    endFilter,
    startFilter,
    statusesFilter,
    hasUnfilledIntervalsFilter,
    hasInProgressIntervalsFilter,
    hasFilledIntervalsFilter,
    updatedBeforeFilter,
    failedAutoAttemptsLessThanFilter,
  ]
    .filter(Boolean)
    .join(' AND ');
};
