/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}: {
  start?: string;
  end?: string;
  statuses?: string[];
  hasUnfilledIntervals?: boolean;
  hasInProgressIntervals?: boolean;
  hasFilledIntervals?: boolean;
}) => {
  const baseFilter = 'event.action: gap AND event.provider: alerting';

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

  return [
    baseFilter,
    endFilter,
    startFilter,
    statusesFilter,
    hasUnfilledIntervalsFilter,
    hasInProgressIntervalsFilter,
    hasFilledIntervalsFilter,
  ]
    .filter(Boolean)
    .join(' AND ');
};
