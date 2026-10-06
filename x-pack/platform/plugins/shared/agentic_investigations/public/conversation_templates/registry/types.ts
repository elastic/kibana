/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { RenderAssignees, RenderStatus } from '@kbn/agentic-investigations-common';
import type { AgenticInvestigationsPublicStartDependencies } from '../../types';

export type TemplateStartDependencies = AgenticInvestigationsPublicStartDependencies & {
  agentBuilder: AgentBuilderPluginStart;
};

/** What the connected render props read through `useKibana`. */
export type TemplateServices = CoreStart & TemplateStartDependencies;

/**
 * Lazily wraps a connected component in `KibanaContextProvider` and its own `QueryClientProvider`,
 * which it needs inside the Agent Builder flyout's own React root.
 */
export type MakeLazyWithProviders = <P extends object>(
  getComponent: () => Promise<React.ComponentType<P>>
) => React.LazyExoticComponent<React.ComponentType<P>>;

/** What a template's `register` receives; the shared render props are created once for all templates. */
export interface TemplateRegistrationContext {
  templateId: string;
  core: CoreStart;
  startDeps: TemplateStartDependencies;
  services: TemplateServices;
  /** When false, no template offers escalation actions. */
  escalationsEnabled: boolean;
  makeLazyWithProviders: MakeLazyWithProviders;
  renderAssignees: RenderAssignees;
  renderStatus: RenderStatus;
}

/** A conversation template whose details flyout UI this plugin registers with Agent Builder. */
export interface TemplateDefinition {
  templateId: string;
  register: (context: TemplateRegistrationContext) => void;
}
