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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentBuilderPlatformPluginSetup } from '@kbn/agent-builder-platform-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { ImpactReadClient } from './impact/services/impact_client';
import type { EscalationsService } from './escalations/services/escalations_service';

export interface AgenticInvestigationsSetupDependencies {
  features: FeaturesPluginSetup;
  /**
   * No API is read from it. Required for ordering: it registers the
   * `escalation` and `investigation` conversation templates this plugin's
   * entities are built on, and `EscalationsService` throws at runtime without
   * them.
   */
  agentBuilderPlatform: AgentBuilderPlatformPluginSetup;
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
   * Request-scoped impact reads. Checks `read_impact` and derives the space
   * from the request, because in-process callers bypass route `security.authz`.
   */
  getImpactClient: (request: KibanaRequest) => ImpactReadClient;
  getEscalationsService: () => EscalationsService;
}

export type AgenticInvestigationsPluginSetup = Record<string, never>;
