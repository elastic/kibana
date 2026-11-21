/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { type unitOfTime } from 'moment';
import type { Filter, TimeRange } from '@kbn/es-query';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_URL,
  ES_QUERY_ID,
  INDEX_THRESHOLD_ID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { ClassicAlertFields } from '../types';
import type {
  AlertDiscoverLinkResolver,
  AlertDiscoverLinkResolvers,
  AlertDiscoverTarget,
} from '../../utils/discover_href_for_alert';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringList = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const resolveEsQueryTarget: AlertDiscoverLinkResolver = ({ [ALERT_URL]: url }) =>
  typeof url === 'string' && url ? { url } : undefined;

const getIndexThresholdGroupFilters = (
  params: Record<string, unknown>,
  instanceId: unknown
): Filter[] => {
  const termFields = toStringList(params.termField);
  if (params.groupBy !== 'top' || termFields.length !== 1 || typeof instanceId !== 'string') {
    return [];
  }

  return [{ meta: {}, query: { match_phrase: { [termFields[0]]: instanceId } } }];
};

const TIME_WINDOW_UNITS: Readonly<Record<string, unitOfTime.DurationConstructor>> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

/** The rule's lookback window ending at the alert's last evaluation (its end once recovered). */
const getEvaluatedTimeRange = (
  { timeWindowSize, timeWindowUnit }: Record<string, unknown>,
  windowEnd: unknown
): TimeRange | undefined => {
  if (typeof windowEnd !== 'string' || Number.isNaN(Date.parse(windowEnd))) return undefined;
  if (typeof timeWindowSize !== 'number' || timeWindowSize <= 0) return undefined;
  if (typeof timeWindowUnit !== 'string' || !Object.hasOwn(TIME_WINDOW_UNITS, timeWindowUnit)) {
    return undefined;
  }

  const to = moment(windowEnd);
  return {
    from: to.clone().subtract(timeWindowSize, TIME_WINDOW_UNITS[timeWindowUnit]).toISOString(),
    to: to.toISOString(),
  };
};

const resolveIndexThresholdTarget: AlertDiscoverLinkResolver = ({
  [ALERT_RULE_PARAMETERS]: params,
  [ALERT_INSTANCE_ID]: instanceId,
  [ALERT_END]: end,
  [TIMESTAMP]: timestamp,
}) => {
  if (!isRecord(params)) return undefined;

  const indices = toStringList(params.index);
  const { timeField, filterKuery } = params;
  if (indices.length === 0 || typeof timeField !== 'string' || !timeField) return undefined;

  const hasFilterQuery = typeof filterKuery === 'string' && filterKuery.length > 0;
  const timeRange = getEvaluatedTimeRange(params, end ?? timestamp);

  return {
    locatorParams: {
      dataViewSpec: { title: indices.join(','), timeFieldName: timeField },
      ...(hasFilterQuery ? { query: { query: filterKuery, language: 'kuery' } } : {}),
      filters: getIndexThresholdGroupFilters(params, instanceId),
      ...(timeRange ? { timeRange } : {}),
    },
  };
};

/** Discover resolvers for the stack rule types owned by this package. */
export const STACK_DISCOVER_LINK_RESOLVERS: AlertDiscoverLinkResolvers = {
  [ES_QUERY_ID]: resolveEsQueryTarget,
  [INDEX_THRESHOLD_ID]: resolveIndexThresholdTarget,
};

/** Whether a resolver is registered for the rule type. */
export const hasDiscoverLinkResolver = (
  resolvers: AlertDiscoverLinkResolvers,
  ruleTypeId: string | undefined
): boolean => ruleTypeId != null && Object.hasOwn(resolvers, ruleTypeId);

/** Resolves where Discover should open for a classic alert document, or `undefined` when it cannot. */
export const getClassicAlertDiscoverTarget = (
  alert: ClassicAlertFields,
  resolvers: AlertDiscoverLinkResolvers
): AlertDiscoverTarget | undefined => {
  const { [ALERT_RULE_TYPE_ID]: ruleTypeId } = alert;
  if (typeof ruleTypeId !== 'string' || !hasDiscoverLinkResolver(resolvers, ruleTypeId)) {
    return undefined;
  }

  return resolvers[ruleTypeId](alert);
};
