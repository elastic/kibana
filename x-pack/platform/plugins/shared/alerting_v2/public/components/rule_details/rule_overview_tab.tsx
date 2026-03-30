/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';
import { buildRuleKpiAttributes } from './rule_kpi_lens_attributes';

const KPI_HEIGHT = 70;
const TIME_RANGE = { from: 'now-7d', to: 'now' };

export interface RuleOverviewTabProps {
  rule: RuleApiResponse;
}

export const RuleOverviewTab: React.FunctionComponent<RuleOverviewTabProps> = ({ rule }) => {
  const { euiTheme } = useEuiTheme();
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const share = useService(PluginStart('share')) as SharePluginStart;
  const LensComponent = lens.EmbeddableComponent;

  const kpis = useMemo(
    () =>
      buildRuleKpiAttributes(rule.id, {
        activeEpisodes: euiTheme.colors.vis.euiColorVis0,
        recoveredEpisodes: euiTheme.colors.vis.euiColorVis9,
        notifications: euiTheme.colors.vis.euiColorVis5,
      }),
    [
      rule.id,
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis9,
      euiTheme.colors.vis.euiColorVis5,
    ]
  );

  const navigateToDiscover = useCallback(() => {
    const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
    locator?.navigate({
      timeRange: { from: TIME_RANGE.from, to: TIME_RANGE.to },
      tabs: kpis.map((kpi) => ({
        label: kpi.label,
        query: { esql: kpi.esqlQuery },
      })),
    });
  }, [share.url.locators, kpis]);

  return (
    <EuiPanel hasBorder data-test-subj="ruleOverviewAlertActivityPanel">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.alertingV2.ruleDetails.overview.alertActivity', {
                defaultMessage: 'Alert activity',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.alertingV2.ruleDetails.overview.timeRange', {
              defaultMessage: 'Last 7 days',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={navigateToDiscover}
            iconType="discoverApp"
            size="s"
            data-test-subj="ruleOverviewExploreInDiscover"
          >
            {i18n.translate('xpack.alertingV2.ruleDetails.overview.exploreInDiscover', {
              defaultMessage: 'Explore in Discover',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" wrap data-test-subj="ruleOverviewKpis">
        {kpis.map((kpi) => (
          <EuiFlexItem key={kpi.id} grow={false} css={{ minWidth: 180 }}>
            <div css={{ height: `${KPI_HEIGHT}px` }}>
              <LensComponent
                id={kpi.id}
                viewMode="view"
                timeRange={TIME_RANGE}
                attributes={kpi.attributes}
                noPadding
                disableTriggers
              />
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
