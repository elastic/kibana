/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { EvalsPluginSetup, EvalsPluginStart } from '@kbn/evals-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';

export interface EvalsSkillsSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  evals: EvalsPluginSetup;
}

/** The part of Security the skills' privilege checks need, which a task pod's Security has too. */
export interface EvalsSkillsSecurity {
  authz: Pick<SecurityPluginStart['authz'], 'actions' | 'checkPrivilegesWithRequest'>;
}

/** What the skills use at run time, which the `server` entry and a task pod both provide. */
export interface EvalsSkillsStartDependencies {
  agentBuilder: { agents: Pick<AgentBuilderPluginStart['agents'], 'getRegistry'> };
  evals: Pick<EvalsPluginStart, 'datasetService' | 'listEvaluators' | 'listModelConnectors'>;
  security?: EvalsSkillsSecurity;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EvalsSkillsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EvalsSkillsPluginStart {}
