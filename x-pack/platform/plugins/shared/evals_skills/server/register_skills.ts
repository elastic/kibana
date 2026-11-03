/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createEvalDatasetManagementSkill } from './skills/eval_dataset_management/skill';
import { createEvalExperimentsSkill } from './skills/eval_experiments/skill';
import type { EvalExperimentsToolDeps } from './skills/eval_experiments/tools/deps';

/**
 * Registers the evals Agent Builder skills, for the `server` entry (Kibana) and the `server/tasks`
 * entry (task pods) alike.
 */
export const registerEvalsSkills = ({
  agentBuilder,
  workflowsApi,
  serverBasePath,
  logger,
  getStartDependencies,
}: Pick<EvalExperimentsToolDeps, 'workflowsApi' | 'serverBasePath' | 'logger'> & {
  agentBuilder: Pick<AgentBuilderPluginSetup, 'skills'>;
  logger: Logger;
  getStartDependencies: EvalExperimentsToolDeps['getStartDependencies'];
}) => {
  agentBuilder.skills.register(
    createEvalExperimentsSkill({ workflowsApi, serverBasePath, logger, getStartDependencies })
  );
  agentBuilder.skills.register(createEvalDatasetManagementSkill({ logger, getStartDependencies }));
};
