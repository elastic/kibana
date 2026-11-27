/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { DfaToolDeps } from '../../tools/dfa/tool_utils';
import { createDfaGetJobTool } from '../../tools/dfa/dfa_get_job';
import { createDfaExplainTool } from '../../tools/dfa/dfa_explain';
import { createDfaEvaluateTool } from '../../tools/dfa/dfa_evaluate';
import { createDfaCreateJobTool } from '../../tools/dfa/dfa_create_job';
import { createDfaManageJobTool } from '../../tools/dfa/dfa_manage_job';
import { createDfaDeleteJobTool } from '../../tools/dfa/dfa_delete_job';
import skillContent from './skill.md.text';
import description from './description.text';
import chooseAnalysis from './references/choose_analysis.md.text';
import createJob from './references/create_job.md.text';
import interpretResults from './references/interpret_results.md.text';
import troubleshoot from './references/troubleshoot.md.text';
import esqlResultQueries from './references/esql_result_queries.md.text';
import jobRecipes from './references/job_recipes.md.text';

export const createDataFrameAnalyticsSkill = (deps: DfaToolDeps) =>
  defineSkillType({
    id: 'ml.data-frame-analytics',
    name: 'data-frame-analytics',
    basePath: 'skills/ml/data_frame_analytics',
    description,
    experimental: true,
    content: skillContent,
    referencedContent: [
      { name: 'choose-analysis', relativePath: './references', content: chooseAnalysis },
      { name: 'create-job', relativePath: './references', content: createJob },
      { name: 'interpret-results', relativePath: './references', content: interpretResults },
      { name: 'troubleshoot', relativePath: './references', content: troubleshoot },
      { name: 'esql-result-queries', relativePath: './references', content: esqlResultQueries },
      { name: 'job-recipes', relativePath: './references', content: jobRecipes },
    ],
    getRegistryTools: () => [platformCoreTools.executeEsql, platformCoreTools.createVisualization],
    getInlineTools: () => [
      createDfaGetJobTool(deps),
      createDfaExplainTool(deps),
      createDfaEvaluateTool(deps),
      createDfaCreateJobTool(deps),
      createDfaManageJobTool(deps),
      createDfaDeleteJobTool(deps),
    ],
  });
