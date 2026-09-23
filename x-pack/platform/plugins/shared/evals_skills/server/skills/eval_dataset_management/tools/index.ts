/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { listEvalDatasetsTool } from '../../common/list_eval_datasets';
import type { EvalDatasetManagementToolDeps } from './deps';

export type { EvalDatasetManagementToolDeps } from './deps';

/** Inline tools exposed by the eval-dataset-management skill. */
export const getEvalDatasetManagementInlineTools = (
  deps: EvalDatasetManagementToolDeps
): SkillBoundedTool[] => [listEvalDatasetsTool(deps)];
