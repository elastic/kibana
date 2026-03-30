/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  RULE_EVENTS_ESQL,
  ALERT_EPISODES_ESQL,
  ALERT_ACTIONS_ESQL,
} from '../../../common/esql_queries';

type LensAttributes = TypedLensByValueInput['attributes'];

const LAYER_ID = 'kpiLayer';
const METRIC_COLUMN_ID = 'count_col';

const buildMetricAttributes = ({
  esqlQuery,
  label,
  color,
}: {
  esqlQuery: string;
  label: string;
  color?: string;
}): LensAttributes => {
  return {
    visualizationType: 'lnsMetric',
    title: '',
    references: [],
    state: {
      datasourceStates: {
        textBased: {
          layers: {
            [LAYER_ID]: {
              query: { esql: esqlQuery },
              columns: [
                {
                  columnId: METRIC_COLUMN_ID,
                  fieldName: 'count',
                  label,
                  customLabel: true,
                  meta: { type: 'number' },
                },
              ],
            },
          },
        },
      },
      visualization: {
        layerId: LAYER_ID,
        layerType: 'data',
        metricAccessor: METRIC_COLUMN_ID,
        showBar: false,
        titlesTextAlign: 'left',
        valuesTextAlign: 'left',
        valueFontMode: 'fit',
        primaryPosition: 'top',
        titleWeight: 'normal',
        ...(color ? { color, applyColorTo: 'value' } : {}),
        secondaryTrend: { type: 'none' },
      },
      filters: [],
      query: { esql: esqlQuery },
    },
  };
};

export interface RuleKpi {
  id: string;
  label: string;
  esqlQuery: string;
  attributes: LensAttributes;
}

export interface RuleKpiColors {
  activeEpisodes: string;
  recoveredEpisodes: string;
  notifications: string;
}

export const buildRuleKpiAttributes = (ruleId: string, colors: RuleKpiColors): RuleKpi[] => {
  const ruleEventsQuery = `${RULE_EVENTS_ESQL} | WHERE rule.id == "${ruleId}"`;
  const alertEpisodesQuery = `${ALERT_EPISODES_ESQL} | WHERE rule.id == "${ruleId}"`;
  const activeEpisodesQuery = `${ALERT_EPISODES_ESQL} | WHERE rule.id == "${ruleId}" AND episode.status IN ("active", "pending")`;
  const recoveredEpisodesQuery = `${ALERT_EPISODES_ESQL} | WHERE rule.id == "${ruleId}" AND episode.status IN ("inactive", "recovering")`;
  const notificationsQuery = `${ALERT_ACTIONS_ESQL} | WHERE rule_id == "${ruleId}" AND action_type == "notified"`;

  return [
    {
      id: 'rule-events-kpi',
      label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.ruleEvents', {
        defaultMessage: 'Rule events',
      }),
      esqlQuery: ruleEventsQuery,
      attributes: buildMetricAttributes({
        esqlQuery: `${ruleEventsQuery} | STATS count = COUNT(*)`,
        label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.ruleEvents', {
          defaultMessage: 'Rule events',
        }),
      }),
    },
    {
      id: 'alert-episodes-kpi',
      label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.totalAlertEpisodes', {
        defaultMessage: 'Total alert episodes',
      }),
      esqlQuery: alertEpisodesQuery,
      attributes: buildMetricAttributes({
        esqlQuery: `${alertEpisodesQuery} | STATS count = COUNT(*)`,
        label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.totalAlertEpisodes', {
          defaultMessage: 'Total alert episodes',
        }),
      }),
    },
    {
      id: 'active-episodes-kpi',
      label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.activeEpisodes', {
        defaultMessage: 'Active episodes',
      }),
      esqlQuery: activeEpisodesQuery,
      attributes: buildMetricAttributes({
        esqlQuery: `${activeEpisodesQuery} | STATS count = COUNT(*)`,
        label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.activeEpisodes', {
          defaultMessage: 'Active episodes',
        }),
        color: colors.activeEpisodes,
      }),
    },
    {
      id: 'recovered-episodes-kpi',
      label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.recoveredEpisodes', {
        defaultMessage: 'Recovered episodes',
      }),
      esqlQuery: recoveredEpisodesQuery,
      attributes: buildMetricAttributes({
        esqlQuery: `${recoveredEpisodesQuery} | STATS count = COUNT(*)`,
        label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.recoveredEpisodes', {
          defaultMessage: 'Recovered episodes',
        }),
        color: colors.recoveredEpisodes,
      }),
    },
    {
      id: 'notifications-kpi',
      label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.notificationsTriggered', {
        defaultMessage: 'Notifications triggered',
      }),
      esqlQuery: notificationsQuery,
      attributes: buildMetricAttributes({
        esqlQuery: `${notificationsQuery} | STATS count = COUNT(*)`,
        label: i18n.translate('xpack.alertingV2.ruleDetails.kpi.notificationsTriggered', {
          defaultMessage: 'Notifications triggered',
        }),
        color: colors.notifications,
      }),
    },
  ];
};
