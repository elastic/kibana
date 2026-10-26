/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_IS_CURRENTLY_ANALYZING = (alertsCount: number) =>
  i18n.translate(
    'xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.aiIsCurrentlyAnalyzing',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} in the last 24 hours to generate discoveries.`,
      values: { alertsCount },
    }
  );

export const AI_IS_CURRENTLY_ANALYZING_FROM = ({
  alertsCount,
  from,
}: {
  alertsCount: number;
  from: string;
}) =>
  i18n.translate(
    'xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.aiIsCurrentlyAnalyzingFromLabel',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} {from} to generate discoveries.`,
      values: { alertsCount, from },
    }
  );

export const AI_IS_CURRENTLY_ANALYZING_RANGE = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end: string;
  start: string;
}) =>
  i18n.translate(
    'xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.aiIsCurrentlyAnalyzingRangeLabel',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} from {start} to {end} to generate discoveries.`,
      values: { alertsCount, end, start },
    }
  );
