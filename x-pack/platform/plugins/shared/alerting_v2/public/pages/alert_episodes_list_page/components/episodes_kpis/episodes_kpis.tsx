/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiCallOut, EuiTitle } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { useEpisodesKpisQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_episodes_kpis_query';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { AlertEpisodesKibanaServices } from '../../../../episodes_kibana_services';
import {
  EPISODES_KPIS_ACKNOWLEDGED,
  EPISODES_KPIS_ALERTS_COUNT,
  EPISODES_KPIS_ALERT_ACTIONS_PANEL_TITLE,
  EPISODES_KPIS_ALERTS_PANEL_TITLE,
  EPISODES_KPIS_ASSIGNED_TO_ME,
  EPISODES_KPIS_ERROR,
  EPISODES_KPIS_ERROR_TITLE,
  EPISODES_KPIS_FIRING_RULES,
  EPISODES_KPIS_SNOOZED,
  EPISODES_KPIS_UNASSIGNED_ALERTS,
} from '../../translations';

export interface EpisodesKpisProps {
  services: AlertEpisodesKibanaServices;
  filterState: EpisodesFilterState;
  timeRange: TimeRange;
}

export const EpisodesKpis = ({ services, filterState, timeRange }: EpisodesKpisProps) => {
  const { data, isLoading, isError } = useEpisodesKpisQuery({ services, filterState, timeRange });

  if (isError) {
    return (
      <EuiPanel hasBorder>
        <EuiCallOut
          announceOnMount
          color="danger"
          title={EPISODES_KPIS_ERROR_TITLE}
          iconType="error"
        >
          {EPISODES_KPIS_ERROR}
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="episodesKpisAlertsPanel">
          <EuiTitle size="xxs">
            <h3>{EPISODES_KPIS_ALERTS_PANEL_TITLE}</h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={data?.alertsCount ?? 0}
                description={EPISODES_KPIS_ALERTS_COUNT}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={data?.firingRules ?? 0}
                description={EPISODES_KPIS_FIRING_RULES}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={data?.assignedToMe ?? 0}
                description={EPISODES_KPIS_ASSIGNED_TO_ME}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder data-test-subj="episodesKpisAlertActionsPanel">
          <EuiTitle size="xxs">
            <h3>{EPISODES_KPIS_ALERT_ACTIONS_PANEL_TITLE}</h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem>
              <EuiStat
                title={data?.unassigned ?? 0}
                description={EPISODES_KPIS_UNASSIGNED_ALERTS}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={data?.acknowledged ?? 0}
                description={EPISODES_KPIS_ACKNOWLEDGED}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={data?.snoozed ?? 0}
                description={EPISODES_KPIS_SNOOZED}
                textAlign="left"
                reverse
                isLoading={isLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
