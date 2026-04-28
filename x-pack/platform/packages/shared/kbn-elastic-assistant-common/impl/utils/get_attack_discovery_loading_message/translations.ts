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

export const START_OF_THE_DAY = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.startOfTheDay', {
    defaultMessage: 'the start of the day',
  });

export const START_OF_THE_WEEK = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.startOfTheWeek', {
    defaultMessage: 'the start of the week',
  });

export const START_OF_THE_MONTH = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.startOfTheMonth', {
    defaultMessage: 'the start of the month',
  });

export const START_OF_THE_YEAR = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.startOfTheYear', {
    defaultMessage: 'the start of the year',
  });

export const FIFTEEN_MINUTES_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.fifteenMinutesAgo', {
    defaultMessage: '15 minutes ago',
  });

export const THIRTY_MINUTES_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.thirtyMinutesAgo', {
    defaultMessage: '30 minutes ago',
  });

export const ONE_HOUR_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.oneHourAgo', {
    defaultMessage: '1 hour ago',
  });

export const TWENTY_FOUR_HOURS_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.twentyFourHoursAgo', {
    defaultMessage: '24 hours ago',
  });

export const SEVEN_DAYS_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.sevenDaysAgo', {
    defaultMessage: '7 days ago',
  });

export const THIRTY_DAYS_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.thirtyDaysAgo', {
    defaultMessage: '30 days ago',
  });

export const NINETY_DAYS_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.ninetyDaysAgo', {
    defaultMessage: '90 days ago',
  });

export const ONE_YEAR_AGO = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.oneYearAgo', {
    defaultMessage: '1 year ago',
  });

export const NOW = () =>
  i18n.translate('xpack.elasticAssistantCommon.attackDiscovery.getLoadingMessage.now', {
    defaultMessage: 'now',
  });
