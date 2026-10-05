/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { evalsDatasetTools } from '../common/tool_ids';
import { createEvalExperimentsSkill } from '../eval_experiments/skill';
import type { EvalExperimentsToolDeps } from '../eval_experiments/tools/deps';
import type { EvalDatasetManagementToolDeps } from './tools/deps';
import { createEvalDatasetManagementSkill } from './skill';

const deps: EvalDatasetManagementToolDeps = {
  logger: loggingSystemMock.createLogger(),
  getStartDependencies: jest.fn(),
};

const writeToolIds = [
  evalsDatasetTools.createDataset,
  evalsDatasetTools.upsertDataset,
  evalsDatasetTools.editExamples,
  evalsDatasetTools.copyDataset,
  evalsDatasetTools.deleteDataset,
];

describe('createEvalDatasetManagementSkill', () => {
  it('produces a schema-valid skill definition', async () => {
    const skill = createEvalDatasetManagementSkill(deps);
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    expect(skill.id).toBe('eval-dataset-management');
    expect(skill.basePath).toBe('skills/platform/evals');
  });

  it('exposes the dataset tools in discover then write order', async () => {
    const skill = createEvalDatasetManagementSkill(deps);
    const tools = (await skill.getInlineTools?.()) ?? [];

    expect(tools.map((tool) => tool.id)).toEqual([
      evalsDatasetTools.listDatasets,
      evalsDatasetTools.getDataset,
      evalsDatasetTools.createDataset,
      evalsDatasetTools.upsertDataset,
      evalsDatasetTools.editExamples,
      evalsDatasetTools.copyDataset,
      evalsDatasetTools.deleteDataset,
    ]);
  });

  it('guards every write tool behind a user confirmation', async () => {
    const skill = createEvalDatasetManagementSkill(deps);
    const tools = (await skill.getInlineTools?.()) ?? [];

    for (const toolId of writeToolIds) {
      const tool = tools.find((candidate) => candidate.id === toolId) as {
        confirmation?: { askUser?: string };
      };
      expect(tool?.confirmation?.askUser).toBe('always');
    }
  });

  it('shares no inline tool id with the eval-experiment-authoring skill', async () => {
    const datasetTools = (await createEvalDatasetManagementSkill(deps).getInlineTools?.()) ?? [];
    const experimentTools =
      (await createEvalExperimentsSkill({
        ...deps,
        serverBasePath: '',
        workflowsApi: {} as unknown as EvalExperimentsToolDeps['workflowsApi'],
      }).getInlineTools?.()) ?? [];

    const experimentToolIds = new Set(experimentTools.map((tool) => tool.id));
    expect(datasetTools.filter((tool) => experimentToolIds.has(tool.id))).toEqual([]);
  });
});
