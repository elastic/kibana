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
import { PluginStart } from '@kbn/core-di';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { bindLocatorsToHost, getAlertingV2Locators } from './application/bind_locators_to_host';
import { LocatorProvider } from './application/locator_context';
import { RuleSummaryFlyoutContainer } from './components/rule/flyouts/rule_summary/rule_summary_flyout_container';
import { untilPluginStartServicesReady } from './kibana_services';
import type { AlertingV2HostApp } from './locators';
import type { RuleApiResponse } from './services/rules_api';

export interface RuleSummaryFlyoutEntryProps {
  ruleId: string;
  hostApp: AlertingV2HostApp;
  onClose: () => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
}

/**
 * Host-facing entry for the Universal (v2) rule summary flyout.
 * Supplies DI + host-bound locators so the flyout works outside RulesPage.
 */
const RuleSummaryFlyoutEntryInner = ({
  ruleId,
  hostApp,
  onClose,
  onEdit,
  onClone,
}: RuleSummaryFlyoutEntryProps) => {
  const { loading, value: services } = useAsync(untilPluginStartServicesReady, []);

  const locators = useMemo(() => {
    if (!services) {
      return null;
    }
    const share = services.container.get(PluginStart('share')) as SharePluginStart;
    return bindLocatorsToHost(getAlertingV2Locators(share), hostApp);
  }, [hostApp, services]);

  if (loading || !services || !locators) {
    return (
      <EuiFlyout
        type="overlay"
        size="m"
        resizable
        ownFocus={false}
        onClose={onClose}
        aria-label={i18n.translate('xpack.alertingV2.ruleSummaryFlyoutEntry.loadingAriaLabel', {
          defaultMessage: 'Rule summary',
        })}
        data-test-subj="ruleSummaryFlyoutEntryLoading"
      >
        <EuiFlyoutBody>
          <EuiLoadingSpinner size="l" />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <Context.Provider value={services.container}>
      <LocatorProvider locators={locators}>
        <RuleSummaryFlyoutContainer
          ruleId={ruleId}
          onClose={onClose}
          onEdit={onEdit}
          onClone={onClone}
        />
      </LocatorProvider>
    </Context.Provider>
  );
};

export const RuleSummaryFlyoutEntry = (props: RuleSummaryFlyoutEntryProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RuleSummaryFlyoutEntryInner {...props} />
      </QueryClientProvider>
    </EuiErrorBoundary>
  );
};
