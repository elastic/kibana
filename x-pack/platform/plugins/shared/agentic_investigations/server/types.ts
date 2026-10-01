/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentBuilderPlatformPluginSetup } from '@kbn/agent-builder-platform-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ImpactReadClient } from './impact/services/impact_client';
import type { SubjectsClient } from './subjects/services/subjects_client';
import type { EscalationsService } from './escalations/services/escalations_service';
import type { DeleteInvestigationDataAcrossSpacesResult } from './investigations/services/delete_investigation_data_across_spaces';
import type { InvestigationsClient } from './investigations/services/investigations_client';

export interface AgenticInvestigationsSetupDependencies {
  features: FeaturesPluginSetup;
  /**
   * No API is read from it. Required for ordering: it registers the
   * `escalation` and `investigation` conversation templates this plugin's
   * entities are built on, and `EscalationsService` throws at runtime without
   * them.
   */
  agentBuilderPlatform: AgentBuilderPlatformPluginSetup;
  /**
   * Registers the readonly investigation_impact, investigation_subject, and
   * investigation_hypotheses attachment types and the `investigations.set_impact`,
   * `investigations.set_hypotheses`, and `investigations.get` tools.
   */
  agentBuilder: AgentBuilderPluginSetup;
  /** Registers Impact workflow steps. */
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  /**
   * Reads executions of registered driver workflows for the in-progress state. Optional: without
   * it only Agent Builder runs count as in progress.
   */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface AgenticInvestigationsStartDependencies {
  /**
   * Needed to authorize an in-process impact read, which bypasses the route's
   * `security.authz`. Optional because Kibana can run without it; the privilege
   * checks fail closed when it is absent.
   */
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  proposals?: ProposalsPluginStart;
  agentBuilder: AgentBuilderPluginStart;
}

/**
 * Exposed so a solution plugin can reach an entity in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one). One getter
 * per entity this plugin owns.
 */
export interface AgenticInvestigationsPluginStart {
  /**
   * Request-scoped impact reads. Reads accept the investigations read or manage
   * privilege, and the space comes from the request, because in-process callers
   * bypass route `security.authz`.
   */
  getImpactClient: (request: KibanaRequest) => ImpactReadClient;
  /**
   * Request-scoped investigation subjects: record them when starting or following up on an
   * investigation, find investigations by subject, and claim subjects for a race-safe start.
   * Reads accept the investigations read or manage privilege; writes and claims need manage.
   * Space and user come from the request.
   */
  getSubjectsClient: (request: KibanaRequest) => SubjectsClient;
  /**
   * Request-scoped investigation reads (get, list, severity counts, open investigations by
   * subject) and the maintenance delete. Reads check the investigations read or manage
   * privilege; space comes from the request.
   */
  getInvestigationsClient: (request: KibanaRequest) => InvestigationsClient;
  /**
   * Maintenance, in every space: removes the subjects, subject claims, impact, and hypotheses of
   * every investigation that has subjects. Runs as the internal user with no request, so the
   * caller must authorize this destructive operation. Agent Builder conversations are not
   * deleted.
   */
  deleteSubjectInvestigationDataAcrossSpaces: () => Promise<DeleteInvestigationDataAcrossSpacesResult>;
  getEscalationsService: () => EscalationsService;
}

export interface AgenticInvestigationsPluginSetup {
  /**
   * Registers a workflow that drives investigations. While an execution of it is not terminal,
   * the investigation named by its concurrency group key (`investigation:<id>`) is in progress.
   */
  registerInvestigationWorkflow: (workflowId: string) => void;
}
