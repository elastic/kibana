/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImpactEntityTarget,
  RegisterFlyoutGroupedAttachment,
} from '@kbn/agentic-investigations-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { CasesPublicSetup, CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ComponentType } from 'react';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { InvestigationCardProps } from './conversation_templates/templates/investigation/card';

export interface AgenticInvestigationsPublicSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
  /** The investigation link attachment and the case view sections, when the cases bridge is on. */
  cases?: CasesPublicSetup;
}

export interface AgenticInvestigationsPublicStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  /** Case lookups for the "Case #N" links and the add-to-existing-case list. */
  cases?: CasesPublicStart;
  proposals?: ProposalsPublicPluginStart;
  /** Locators that link alert subjects to their details pages. */
  share?: SharePluginStart;
  /**
   * The services the alert subject flyout needs. All optional: a deployment without one of them
   * keeps the subject row as a plain link to the alert's details page.
   */
  data?: DataPublicPluginStart;
  dataViews?: DataViewsPublicPluginStart;
  expressions?: ExpressionsStart;
  spaces?: SpacesPluginStart;
  unifiedDocViewer?: UnifiedDocViewerStart;
  charts?: ChartsPluginStart;
}

/** The part of `xpack.agenticInvestigations` exposed to the browser. */
export interface AgenticInvestigationsPublicConfig {
  /** Escalations are AlertZero-only for now; off on Observability serverless. */
  escalations: { enabled: boolean };
  /** Open a case from an investigation; replaces escalations when on. */
  cases?: { enabled: boolean };
}

export interface AgenticInvestigationsPublicPluginSetup {
  registerFlyoutGroupedAttachment: RegisterFlyoutGroupedAttachment;
}

/** Opens the entity flyout for one impacted entity. Supplied by the solution that owns the flyout. */
export type ImpactEntityOpener = (entity: ImpactEntityTarget) => void;

export interface AgenticInvestigationsPublicPluginStart {
  /**
   * Registers the entity-flyout opener. Called from the solution's start, which runs after this
   * plugin's start, so the overview reads it when a row is clicked rather than at registration.
   */
  registerImpactEntityOpener: (opener: ImpactEntityOpener) => void;
  /**
   * The investigation card the `investigation` template's brief card renders, for a solution
   * that lists investigations from the query API itself. Loaded on first render.
   */
  InvestigationCard: ComponentType<InvestigationCardProps>;
  /**
   * True when investigations open cases instead of escalations. AlertZero reads it to hide the
   * Escalations page and send its old URL to the cases list.
   */
  isCasesBridgeEnabled: boolean;
  /** Whether the user can create Security cases, for gating Open a case where the host renders it. */
  canCreateCases: () => boolean;
}
