/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { EpisodesKpiCounts } from '../hooks/use_episodes_kpi_counts';
import {
  isActionKpiSelected,
  isAlertsKpiSelected,
  toggleActionKpiFilter,
  toggleAlertsKpiFilter,
} from '../utils/episodes_kpi_filter_utils';
import * as i18n from '../translations';
import { KpiMetricItem } from './kpi_metric_item';

export interface EpisodesKpiBlocksProps {
  filterState: EpisodesFilterState;
  onFilterChange: (next: EpisodesFilterState) => void;
  counts: EpisodesKpiCounts;
  isLoading?: boolean;
}

interface KpiSectionProps {
  title: string;
  'data-test-subj': string;
  children: React.ReactNode;
}

const KpiSection = ({ title, children, 'data-test-subj': dataTestSubj }: KpiSectionProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={1}>
      <EuiPanel
        paddingSize="s"
        hasShadow={false}
        data-test-subj={dataTestSubj}
        css={css`
          width: 100%;
          height: 100%;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="flexStart"
              responsive={false}
              wrap={false}
            >
              {children}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

export const EpisodesKpiBlocks = ({
  filterState,
  onFilterChange,
  counts,
}: EpisodesKpiBlocksProps) => {
  const onAlertsKpiClick = useCallback(
    (kpi: 'active' | 'high_severity' | 'total') => {
      onFilterChange(toggleAlertsKpiFilter(filterState, kpi));
    },
    [filterState, onFilterChange]
  );

  const onActionKpiClick = useCallback(
    (kpi: 'assigned_to_me' | 'unassigned' | 'acknowledged' | 'snoozed') => {
      onFilterChange(toggleActionKpiFilter(filterState, kpi));
    },
    [filterState, onFilterChange]
  );

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="stretch"
      responsive={false}
      data-test-subj="episodesKpiBlocks"
      css={css`
        width: 100%;
      `}
    >
      <KpiSection title={i18n.EPISODES_KPI_ALERTS_TITLE} data-test-subj="episodesKpi-alerts">
        <KpiMetricItem
          label={i18n.EPISODES_KPI_ACTIVE_ALERTS}
          value={counts.activeAlerts}
          isSelected={isAlertsKpiSelected(filterState, 'active')}
          emphasizeValue
          onClick={() => onAlertsKpiClick('active')}
          data-test-subj="episodesKpi-activeAlerts"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_HIGH_SEVERITY}
          value={counts.highSeverityAlerts}
          isSelected={isAlertsKpiSelected(filterState, 'high_severity')}
          emphasizeValue
          onClick={() => onAlertsKpiClick('high_severity')}
          data-test-subj="episodesKpi-highSeverity"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_TOTAL_ALERTS}
          value={counts.totalAlerts}
          isSelected={isAlertsKpiSelected(filterState, 'total')}
          onClick={() => onAlertsKpiClick('total')}
          data-test-subj="episodesKpi-totalAlerts"
        />
      </KpiSection>

      <KpiSection title={i18n.EPISODES_KPI_ACTIONS_TITLE} data-test-subj="episodesKpi-alertActions">
        <KpiMetricItem
          label={i18n.EPISODES_KPI_ASSIGNED_TO_ME}
          value={counts.assignedToMe}
          isSelected={isActionKpiSelected(filterState, 'assigned_to_me')}
          onClick={() => onActionKpiClick('assigned_to_me')}
          data-test-subj="episodesKpi-assignedToMe"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_UNASSIGNED}
          value={counts.unassigned}
          isSelected={isActionKpiSelected(filterState, 'unassigned')}
          onClick={() => onActionKpiClick('unassigned')}
          data-test-subj="episodesKpi-unassigned"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_ACKNOWLEDGED}
          value={counts.acknowledged}
          isSelected={isActionKpiSelected(filterState, 'acknowledged')}
          onClick={() => onActionKpiClick('acknowledged')}
          data-test-subj="episodesKpi-acknowledged"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_SNOOZED}
          value={counts.snoozed}
          isSelected={isActionKpiSelected(filterState, 'snoozed')}
          onClick={() => onActionKpiClick('snoozed')}
          data-test-subj="episodesKpi-snoozed"
        />
      </KpiSection>

      <KpiSection title={i18n.EPISODES_KPI_RULES_TITLE} data-test-subj="episodesKpi-rules">
        <KpiMetricItem
          label={i18n.EPISODES_KPI_TOTAL_RULES}
          value={counts.totalRules}
          isInteractive={false}
          data-test-subj="episodesKpi-totalRules"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_FIRING_RULES}
          value={counts.firingRules}
          isInteractive={false}
          data-test-subj="episodesKpi-firingRules"
        />
        <KpiMetricItem
          label={i18n.EPISODES_KPI_ENABLED_RULES}
          value={counts.enabledRules}
          isInteractive={false}
          data-test-subj="episodesKpi-enabledRules"
        />
      </KpiSection>
    </EuiFlexGroup>
  );
};
