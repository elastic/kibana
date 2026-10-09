/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Container } from 'inversify';
import { createAlertingV2HostApp } from '../common/locators';
import type { AlertingV2PublicStart } from './types';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { AlertingV2PageProps } from './application/composable_pages';
import type { AlertingV2AlertsProviderProps } from './application/alerts_provider';
import type { ClassicRuleSummaryFlyoutProps } from './classic_rule_summary_flyout';
import type { RuleSummaryFlyoutEntryProps } from './rule_summary_flyout_entry';

const LazyCreateRuleOptionsFlyout = React.lazy(() =>
  import('./create_rule_options_flyout').then((m) => ({ default: m.CreateRuleOptionsFlyout }))
);

const CreateRuleOptionsFlyout = (props: CreateRuleOptionsFlyoutProps) =>
  React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyCreateRuleOptionsFlyout, props)
  );

const LazyClassicRuleSummaryFlyout = React.lazy(() =>
  import('./classic_rule_summary_flyout').then((m) => ({ default: m.ClassicRuleSummaryFlyout }))
);

const ClassicRuleSummaryFlyout = (props: ClassicRuleSummaryFlyoutProps) =>
  React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyClassicRuleSummaryFlyout, props)
  );

const LazyRuleSummaryFlyout = React.lazy(() =>
  import('./rule_summary_flyout_entry').then((m) => ({ default: m.RuleSummaryFlyoutEntry }))
);

const RuleSummaryFlyout = (props: RuleSummaryFlyoutEntryProps) =>
  React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyRuleSummaryFlyout, props)
  );

/**
 * Injects this plugin's DI container into a composable page or provider.
 *
 * Do not use `props.coreStart.injection.getContainer()`: when a host plugin
 * (e.g. observabilityAlerting) renders these, that call returns the
 * *host* container, which does not bind `PluginStart('share')` or this
 * plugin's internal services.
 */
const lazyComponentWithContainer = <P extends object>(
  loader: () => Promise<{
    default: React.ComponentType<P & { container: Container }>;
  }>,
  container: Container
): React.ComponentType<P> => {
  // Typed as a plain record internally: `React.createElement` cannot verify a generic
  // `P & { container }` against `PropsWithoutRef<P & { container }>`. The exported signature
  // below still holds consumers to `P`.
  const LazyComponent = React.lazy(loader) as unknown as React.ComponentType<
    Record<string, unknown>
  >;
  return (props: P) =>
    React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(LazyComponent, { ...props, container } as Record<string, unknown>)
    );
};

const lazyPageWithContainer = (
  loader: () => Promise<{
    default: React.ComponentType<AlertingV2PageProps & { container: Container }>;
  }>,
  container: Container
) => lazyComponentWithContainer<AlertingV2PageProps>(loader, container);

/** Builds the plugin's `Start` contract: the lazy, container-injected composable pages. */
export const createStartContract = (container: Container): AlertingV2PublicStart => ({
  CreateRuleOptionsFlyout,
  ClassicRuleSummaryFlyout,
  RuleSummaryFlyout,
  RulesPage: lazyPageWithContainer(
    () =>
      import('./application/composable_pages').then((m) => ({
        default: m.AlertingV2RulesPage,
      })),
    container
  ),
  RuleLibraryPage: lazyPageWithContainer(
    () =>
      import('./application/composable_pages').then((m) => ({
        default: m.AlertingV2RuleLibraryPage,
      })),
    container
  ),
  EpisodesPage: lazyPageWithContainer(
    () =>
      import('./application/composable_pages').then((m) => ({
        default: m.AlertingV2EpisodesPage,
      })),
    container
  ),
  AlertsProvider: lazyComponentWithContainer<AlertingV2AlertsProviderProps>(
    () =>
      import('./application/alerts_provider').then((m) => ({
        default: m.AlertingV2AlertsProvider,
      })),
    container
  ),
  ActionPoliciesPage: lazyPageWithContainer(
    () =>
      import('./application/composable_pages').then((m) => ({
        default: m.AlertingV2ActionPoliciesPage,
      })),
    container
  ),
  ExecutionHistoryPage: lazyPageWithContainer(
    () =>
      import('./application/composable_pages').then((m) => ({
        default: m.AlertingV2ExecutionHistoryPage,
      })),
    container
  ),
  createAlertingV2HostApp,
});
