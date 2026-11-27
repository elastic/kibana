/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterFlyoutGroupedAttachment } from '@kbn/agentic-investigations-common';
import type { ImpactEntityTarget } from '@kbn/agentic-investigations-impact';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ComponentType } from 'react';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { AlertSubjectSnapshot } from '../common/subjects/subject';
import type { InvestigationCardProps } from './conversation_templates/templates/investigation/card';

export interface AgenticInvestigationsPublicSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface AgenticInvestigationsPublicStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
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
}

export interface AgenticInvestigationsPublicPluginSetup {
  registerFlyoutGroupedAttachment: RegisterFlyoutGroupedAttachment;
  /**
   * Registers the flyout that shows the alerts of one `source` (an alerting v2 alert's producer),
   * so an investigation opens them where the user already is instead of the default alert flyout.
   * Read when a subject is clicked, so the registration can be made, or finish, at any point.
   */
  registerAlertFlyout: (source: string, registration: AlertFlyoutRegistration) => void;
}

/** Opens the entity flyout for one impacted entity. Supplied by the solution that owns the flyout. */
export type ImpactEntityOpener = (entity: ImpactEntityTarget) => void;

/** A flyout a solution registers for the alerts of one `source`. */
export interface AlertFlyoutRegistration {
  Component: ComponentType<AlertFlyoutProps>;
  /**
   * Whether the flyout can show this alert; without it, or when it returns false, the alert opens
   * as it would without a registered flyout instead of a flyout that cannot resolve it.
   */
  canOpen?: (snapshot?: AlertSubjectSnapshot) => boolean;
}

/** The props of a flyout a solution registers for the alerts of one `source`. */
export interface AlertFlyoutProps {
  /** The subject id: a classic alert's uuid, or an alerting v2 alert's episode id. */
  alertId: string;
  /** The alert as it was when the investigation started; its `data` is the producer's own. */
  snapshot?: AlertSubjectSnapshot;
  /** The alert's details page, for a registered flyout fallback. */
  detailsHref?: string;
  onClose: () => void;
}

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
}
