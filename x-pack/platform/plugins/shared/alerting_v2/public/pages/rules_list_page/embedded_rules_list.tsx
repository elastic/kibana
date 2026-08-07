/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { Container } from 'inversify';
import { Context } from '@kbn/core-di-browser';
import { untilPluginStartServicesReady } from '../../kibana_services';
import { BreadcrumbProvider } from '../../application/breadcrumb_context';
import { RulesListPage } from './rules_list_page';

export interface EmbeddedRulesListProps {
  onHeaderMenuChange?: (menu: AppHeaderMenu | undefined) => void;
  /**
   * When set, rule name clicks navigate here instead of Stack Management
   * (Observability Rules hub POC). Receives the rule id; return a
   * basePath-prefixed absolute path.
   */
  getRuleDetailsHref?: (ruleId: string) => string;
}

/**
 * Embeddable Alerting v2 rules list for the Observability Rules hub.
 * Provides the alerting_v2 DI context without mounting the management app.
 */
export function EmbeddedRulesList({
  onHeaderMenuChange,
  getRuleDetailsHref,
}: EmbeddedRulesListProps) {
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
          <EuiLoadingSpinner size="l" data-test-subj="alertingV2EmbeddedRulesLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Context.Provider value={container}>
      <BreadcrumbProvider setBreadcrumbs={() => {}}>
        <RulesListPage
          embedded
          onHeaderMenuChange={onHeaderMenuChange}
          getRuleDetailsHref={getRuleDetailsHref}
        />
      </BreadcrumbProvider>
    </Context.Provider>
  );
}
