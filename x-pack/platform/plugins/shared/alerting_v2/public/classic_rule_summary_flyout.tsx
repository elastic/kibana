/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiErrorBoundary, EuiFlyout, EuiFlyoutBody, EuiLoadingSpinner } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Context } from '@kbn/core-di-browser';
import { EpisodeDataSourceProvider } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { RuleSummaryFlyoutContainer } from './components/rule/flyouts/rule_summary/rule_summary_flyout_container';
import { CLASSIC_EPISODES_DATA_SOURCE } from './episode_sources';
import { untilPluginStartServicesReady } from './kibana_services';

export interface ClassicRuleSummaryFlyoutProps {
  ruleId: string;
  /** Optional classic rule-type label shown in the summary conditions. */
  ruleCategory?: string;
  onClose: () => void;
}

/**
 * Host-facing entry for the classic (v1) rule summary flyout used in Alerts.
 * Supplies DI + classic episode data source so the same SourceRuleSummaryFlyout
 * stack works outside the episodes page.
 */
const ClassicRuleSummaryFlyoutInner = ({
  ruleId,
  ruleCategory,
  onClose,
}: ClassicRuleSummaryFlyoutProps) => {
  const { loading, value: services } = useAsync(untilPluginStartServicesReady, []);

  if (loading || !services) {
    return (
      <EuiFlyout
        type="overlay"
        size="m"
        resizable
        ownFocus={false}
        onClose={onClose}
        aria-label={i18n.translate('xpack.alertingV2.classicRuleSummaryFlyout.loadingAriaLabel', {
          defaultMessage: 'Rule summary',
        })}
        data-test-subj="classicRuleSummaryFlyoutLoading"
      >
        <EuiFlyoutBody>
          <EuiLoadingSpinner size="l" />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <Context.Provider value={services.container}>
      <EpisodeDataSourceProvider dataSource={CLASSIC_EPISODES_DATA_SOURCE} queryV2Source={false}>
        <RuleSummaryFlyoutContainer
          ruleId={ruleId}
          sourceRuleInfo={{ category: ruleCategory }}
          onClose={onClose}
          onEdit={onClose}
          onClone={onClose}
        />
      </EpisodeDataSourceProvider>
    </Context.Provider>
  );
};

export const ClassicRuleSummaryFlyout = (props: ClassicRuleSummaryFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ClassicRuleSummaryFlyoutInner {...props} />
      </QueryClientProvider>
    </EuiErrorBoundary>
  );
};
