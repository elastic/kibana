/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackModule, RedTeamDataset, RedTeamDatasetConfig } from './types';
import { promptInjectionModule } from './modules/prompt_injection';
import { privilegeEscalationModule } from './modules/privilege_escalation';
import { infoExtractionModule } from './modules/info_extraction';
import { jailbreakingModule } from './modules/jailbreaking';

export const ALL_MODULES: AttackModule[] = [
  promptInjectionModule,
  privilegeEscalationModule,
  infoExtractionModule,
  jailbreakingModule,
];

export const MODULES_BY_NAME = new Map<string, AttackModule>(ALL_MODULES.map((m) => [m.name, m]));

/**
 * Builds an `EvaluationDataset<AttackExample>` from attack modules.
 *
 * The returned dataset is directly usable with `executorClient.runExperiment()`:
 *
 * ```ts
 * const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });
 * await executorClient.runExperiment({ dataset, task }, evaluators);
 * ```
 */
export const createRedTeamDataset = (config: RedTeamDatasetConfig = {}): RedTeamDataset => {
  let selectedModules: AttackModule[];

  if (config.modules) {
    const unknownModules = config.modules.filter((name) => !MODULES_BY_NAME.has(name));
    if (unknownModules.length > 0) {
      throw new Error(
        `Unknown red-team module names: ${unknownModules.join(', ')}. ` +
          `Available: ${ALL_MODULES.map((m) => m.name).join(', ')}`
      );
    }

    selectedModules = config.modules
      .map((name) => MODULES_BY_NAME.get(name))
      .filter((m): m is AttackModule => m !== undefined);
  } else {
    selectedModules = ALL_MODULES;
  }

  const examples = selectedModules.flatMap((m) => m.generate(config.moduleConfig));

  const moduleNames = selectedModules.map((m) => m.name).join(', ');

  return {
    name: config.name ?? 'red-team',
    description:
      config.description ?? `Red-team adversarial attack dataset covering: ${moduleNames}`,
    examples,
  };
};
