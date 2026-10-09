/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { EvalExperimentsToolDeps } from './tools/deps';
import { evalsTools } from './tools/common';
import { createEvalExperimentsSkill } from './skill';

const deps: EvalExperimentsToolDeps = {
  workflowsApi: {} as unknown as EvalExperimentsToolDeps['workflowsApi'],
  serverBasePath: '',
  logger: loggingSystemMock.createLogger(),
  getStartDependencies: jest.fn(),
};

describe('createEvalExperimentsSkill', () => {
  it('produces a schema-valid skill definition', async () => {
    const skill = createEvalExperimentsSkill(deps);
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    expect(skill.id).toBe('eval-experiment-authoring');
    expect(skill.basePath).toBe('skills/platform/evals');
  });

  it('exposes the eval tools in discover -> preview -> save/run order', async () => {
    const skill = createEvalExperimentsSkill(deps);
    const tools = (await skill.getInlineTools?.()) ?? [];

    expect(tools.map((tool) => tool.id)).toEqual([
      evalsTools.listDatasets,
      evalsTools.listEvaluators,
      evalsTools.listTargets,
      evalsTools.listConnectors,
      evalsTools.previewExperiment,
      evalsTools.saveExperiment,
      evalsTools.runExperiment,
    ]);
  });

  it('guards the run tool behind a user confirmation', async () => {
    const skill = createEvalExperimentsSkill(deps);
    const tools = (await skill.getInlineTools?.()) ?? [];
    const runTool = tools.find((tool) => tool.id === evalsTools.runExperiment) as {
      confirmation?: { askUser?: string };
    };

    expect(runTool?.confirmation?.askUser).toBe('always');
  });
});
