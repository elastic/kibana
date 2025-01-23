/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildGapsFilter = ({
  start,
  end,
  statuses,
}: {
  start?: string;
  end?: string;
  statuses?: string[];
}) => {
  const baseFilter = 'event.action: gap AND event.provider: alerting';

  const rangeFilter =
    end && start
      ? `kibana.alert.rule.gap.range <= "${end}" AND kibana.alert.rule.gap.range >= "${start}"`
      : null;

  const statusesFilter = statuses?.length
    ? `(${statuses.map((status) => `kibana.alert.rule.gap.status : ${status}`).join(' OR ')})`
    : null;

  return [baseFilter, rangeFilter, statusesFilter].filter(Boolean).join(' AND ');
};
