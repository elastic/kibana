/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EvalsSkillsConfig } from './config';
import type {
  EvalsSkillsSetupDependencies,
  EvalsSkillsStartDependencies,
  EvalsSkillsPluginSetup,
  EvalsSkillsPluginStart,
} from './types';
import { createEvalExperimentsSkill } from './skills/eval_experiments/skill';
import type { EvalExperimentsToolDeps } from './skills/eval_experiments/tools/deps';

/**
 * "Glue" plugin that registers evals-domain Agent Builder skills.
 *
 * It depends on both `agentBuilder` and `evals` so the two feature plugins never
 * have to depend on each other (`agentBuilder` already optionally depends on
 * `evals`, so a direct `evals -> agentBuilder` edge would be a cycle).
 *
 * Everything it registers is gated on `xpack.evals.enabled`: when the evals
 * feature is disabled, core disables this required-dependent plugin as well, and
 * the extra `evals.enabled` guard below covers the `forceEnableAllPlugins` /
 * direct-instantiation (test) cases.
 */
export class EvalsSkillsPlugin
  implements
    Plugin<
      EvalsSkillsPluginSetup,
      EvalsSkillsPluginStart,
      EvalsSkillsSetupDependencies,
      EvalsSkillsStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<EvalsSkillsConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<EvalsSkillsStartDependencies, EvalsSkillsPluginStart>,
    { agentBuilder, workflowsManagement, evals }: EvalsSkillsSetupDependencies
  ): EvalsSkillsPluginSetup {
    if (!evals.enabled) {
      this.logger.debug(
        'The evals plugin is disabled; skipping registration of evals Agent Builder skills.'
      );
      return {};
    }

    const toolDeps: EvalExperimentsToolDeps = {
      workflowsApi: workflowsManagement.management,
      serverBasePath: coreSetup.http.basePath.serverBasePath,
      getStartDependencies: () =>
        coreSetup.getStartServices().then(([, startDependencies]) => startDependencies),
    };

    agentBuilder.skills.register(createEvalExperimentsSkill(toolDeps));
    this.logger.debug('Registered evals Agent Builder skill(s).');

    return {};
  }

  start(_coreStart: CoreStart, _startDeps: EvalsSkillsStartDependencies): EvalsSkillsPluginStart {
    return {};
  }

  stop() {}
}
