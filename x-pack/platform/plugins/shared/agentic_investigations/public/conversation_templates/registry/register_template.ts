/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { RenderAssignees, RenderStatus } from '@kbn/agentic-investigations-common';
import { EscalationModalBoundary } from '../shared/escalation_modal/escalation_modal_boundary';
import type {
  TemplateDefinition,
  TemplateRegistrationContext,
  TemplateServices,
  TemplateStartDependencies,
} from './types';

export interface RegisterTemplateOptions {
  core: CoreStart;
  startDeps: TemplateStartDependencies;
  templates: readonly TemplateDefinition[];
}

/**
 * Registers the conversation details flyout UI of the given conversation templates. Write actions
 * are gated at render time on the agentic investigations UI capabilities or, without them, on the
 * API privileges the privileges probe reports (see `PrivilegeGate`).
 */
export const registerTemplate = ({ core, startDeps, templates }: RegisterTemplateOptions): void => {
  const services: TemplateServices = { ...core, ...startDeps };

  // Every connected render prop mounts inside the Agent Builder flyout's own React root, so it
  // needs KibanaContextProvider + QueryClientProvider. Each factory call creates an independent
  // QueryClient so caches don't bleed across flyouts. Wrapped lazily so these heavy deps land in
  // async chunks rather than the page load bundle.
  const makeLazyWithProviders = <P extends object>(
    getComponent: () => Promise<React.ComponentType<P>>
  ): React.LazyExoticComponent<React.ComponentType<P>> =>
    React.lazy(async () => {
      const [{ KibanaContextProvider }, { QueryClient, QueryClientProvider }, Component] =
        await Promise.all([
          import('@kbn/kibana-react-plugin/public'),
          import('@kbn/react-query'),
          getComponent(),
        ]);

      const queryClient = new QueryClient();

      const Wrapped: React.FC<P> = (props) =>
        React.createElement(
          KibanaContextProvider,
          { services },
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(Component, props)
          )
        );

      return { default: Wrapped };
    });

  const LazyConnectedAssignees = makeLazyWithProviders(async () => {
    const { ConnectedAssignees } = await import(
      '../shared/connected_assignees/connected_assignees'
    );
    return ConnectedAssignees as React.ComponentType<
      React.ComponentProps<typeof ConnectedAssignees>
    >;
  });

  const LazyConnectedStatusToggle = makeLazyWithProviders(async () => {
    const { ConnectedStatusToggle } = await import(
      '../shared/connected_status/connected_status_toggle'
    );
    return ConnectedStatusToggle as React.ComponentType<
      React.ComponentProps<typeof ConnectedStatusToggle>
    >;
  });

  const renderAssignees: RenderAssignees = (props) =>
    React.createElement(
      EscalationModalBoundary,
      null,
      React.createElement(LazyConnectedAssignees, props)
    );

  const renderStatus: RenderStatus = (props) =>
    React.createElement(
      EscalationModalBoundary,
      null,
      React.createElement(LazyConnectedStatusToggle, props)
    );

  const context: Omit<TemplateRegistrationContext, 'templateId'> = {
    core,
    startDeps,
    services,
    makeLazyWithProviders,
    renderAssignees,
    renderStatus,
  };

  for (const { templateId, register } of templates) {
    register({ ...context, templateId });
  }
};
