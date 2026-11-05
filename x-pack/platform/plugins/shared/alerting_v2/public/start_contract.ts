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

const LazyCreateRuleOptionsFlyout = React.lazy(() =>
  import('./create_rule_options_flyout').then((m) => ({ default: m.CreateRuleOptionsFlyout }))
);

const CreateRuleOptionsFlyout = (props: CreateRuleOptionsFlyoutProps) =>
  React.createElement(
    React.Suspense,
    { fallback: null },
    React.createElement(LazyCreateRuleOptionsFlyout, props)
  );

/**
 * Injects this plugin's DI container into a composable page.
 *
 * Do not use `props.coreStart.injection.getContainer()`: when a host plugin
 * (e.g. observabilityAlerting) renders these pages, that call returns the
 * *host* container, which does not bind `PluginStart('share')` or this
 * plugin's internal services.
 */
const lazyPageWithContainer = (
  loader: () => Promise<{
    default: React.ComponentType<AlertingV2PageProps & { container: Container }>;
  }>,
  container: Container
): React.ComponentType<AlertingV2PageProps> => {
  const LazyComponent = React.lazy(loader);
  return (props: AlertingV2PageProps) =>
    React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(LazyComponent, {
        ...props,
        container,
      })
    );
};

/** Builds the plugin's `Start` contract: the lazy, container-injected composable pages. */
export const createStartContract = (container: Container): AlertingV2PublicStart => ({
  CreateRuleOptionsFlyout,
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
