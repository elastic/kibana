/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowApi } from '@kbn/workflows-ui';

export const linkedRulesQueryOptions = (api: WorkflowApi, workflowIds: string[]) => ({
  queryKey: ['workflowLinkedRules', workflowIds],
  queryFn: () => api.getLinkedRules(workflowIds),
  retry: false,
});
