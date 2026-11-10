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
import type { ComponentType, ReactNode } from 'react';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { AlertSubjectSnapshot } from '../common/subjects/subject';
import type { InvestigationImpactMapResponse } from '../common/investigations/investigation';
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
  /**
   * Registers the component that draws an investigation's impact map, which adds the Impact map
   * tab to the investigation flyout. Call it from `setup`: the tab is registered in this plugin's
   * `start`. The last registration wins.
   */
  registerImpactMapRenderer: (renderer: ImpactMapRenderer) => void;
  /**
   * Registers how an entity is found in a solution, which adds an external link to its flyout
   * when it is found. Call it from `setup`. The last registration wins.
   */
  registerImpactEntityLink: (resolver: ImpactEntityLinkResolver) => void;
}

/** Props of the component that draws an impact map. It fills its container. */
export interface ImpactMapRendererProps {
  impactMap: InvestigationImpactMapResponse;
  /** Called with the entity id when a node is clicked, to show what happened to it. */
  onEntityClick?: (entityId: string) => void;
  /** Called with the relationship id when an edge is clicked. */
  onRelationshipClick?: (relationshipId: string) => void;
  /** Called by the map's full-screen control. Without it the map shows no such control. */
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
}

/**
 * Draws an investigation's impact map. Supplied by the solution that owns the graph rendering
 * (APM's service map), so this plugin carries no graph code of its own.
 */
export type ImpactMapRenderer = ComponentType<ImpactMapRendererProps>;

/** What a solution is told about an entity when asked where it can show it. */
export interface ImpactEntityLinkTarget {
  id: string;
  label: string;
  /** The kind of its type: a service or infrastructure (older maps may say dependency). */
  kind: string;
  metadata?: Array<{ key: string; value: string }>;
}

/** Where a solution shows the entity: its own flyout, opened over the investigation's. */
export interface ImpactEntityLink {
  /** The button's text; "View APM service" for APM. */
  label: string;
  /**
   * The solution's flyout. `historyKey` puts it in the investigation flyout's back-button stack,
   * and it calls `onClose` when the reader closes it.
   */
  renderFlyout: (params: { onClose: () => void; historyKey?: symbol }) => ReactNode;
}

/** Finds the entity in a solution, or resolves to undefined when it is not there. */
export type ImpactEntityLinkResolver = (
  entity: ImpactEntityLinkTarget
) => Promise<ImpactEntityLink | undefined>;

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
