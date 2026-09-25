/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { listEvalDatasetsTool } from '../../common/list_eval_datasets';
import { evalsDatasetTools } from '../../common/tool_ids';
import type { EvalDatasetManagementToolDeps } from './deps';
import { copyDatasetTool } from './copy_dataset';
import { createDatasetTool } from './create_dataset';
import { deleteDatasetTool } from './delete_dataset';
import { editExamplesTool } from './edit_examples';
import { getDatasetTool } from './get_dataset';
import { upsertDatasetTool } from './upsert_dataset';

export type { EvalDatasetManagementToolDeps } from './deps';

/**
 * Inline tools exposed by the eval-dataset-management skill, in the recommended
 * order of use: discover, then write.
 */
export const getEvalDatasetManagementInlineTools = (
  deps: EvalDatasetManagementToolDeps
): SkillBoundedTool[] => [
  listEvalDatasetsTool(deps, evalsDatasetTools.listDatasets),
  getDatasetTool(deps),
  createDatasetTool(deps),
  upsertDatasetTool(deps),
  editExamplesTool(deps),
  copyDatasetTool(deps),
  deleteDatasetTool(deps),
];
