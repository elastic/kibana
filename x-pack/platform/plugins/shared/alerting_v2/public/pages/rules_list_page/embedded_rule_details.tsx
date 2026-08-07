/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { Container } from 'inversify';
import { i18n } from '@kbn/i18n';
import { Context } from '@kbn/core-di-browser';
import { untilPluginStartServicesReady } from '../../kibana_services';
import { BreadcrumbProvider } from '../../application/breadcrumb_context';
import { RequireAlertingPrivilege } from '../../components/require_alerting_privilege';
import { RuleDetailsRoute } from '../../routes/rule_details_route';

export interface EmbeddedRuleDetailsProps {
  /** Absolute (basePath-prefixed) href back to the Observability Rules hub. */
  rulesListHref: string;
  /**
   * App path for Observability Inbox (no http basePath), e.g.
   * `/app/observability/alerts/inbox`. Used for "View all episodes".
   */
  episodesListBasePath: string;
}

/**
 * Embeddable Alerting v2 rule details for Observability Rules hub.
 * Stays under `/app/observability/alerts/rules-hub/:ruleId` — does not use
 * Stack Management chrome.
 */
export function EmbeddedRuleDetails({
  rulesListHref,
  episodesListBasePath,
}: EmbeddedRuleDetailsProps) {
  const [container, setContainer] = useState<Container | null>(null);

  useEffect(() => {
    let cancelled = false;
    untilPluginStartServicesReady().then((services) => {
      if (!cancelled) {
        setContainer(services.container);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!container) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" data-test-subj="alertingV2EmbeddedRuleDetailsLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Context.Provider value={container}>
      <BreadcrumbProvider setBreadcrumbs={() => {}}>
        <RequireAlertingPrivilege
          features={['rules']}
          pageName={i18n.translate('xpack.alertingV2.embeddedRuleDetails.pageName', {
            defaultMessage: 'Rules',
          })}
        >
          <RuleDetailsRoute
            rulesListHref={rulesListHref}
            episodesListBasePath={episodesListBasePath}
          />
        </RequireAlertingPrivilege>
      </BreadcrumbProvider>
    </Context.Provider>
  );
}
