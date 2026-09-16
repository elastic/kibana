/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import type { WorkflowDetailDto } from '@kbn/workflows';

const MOCK_WORKFLOW: WorkflowDetailDto = {
  id: 'workflow-1',
  name: 'Slack notification workflow',
  description: 'Sends alerts to Slack',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'user',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'user',
  definition: null,
  yaml: 'name: Slack notification workflow\nsteps:\n  - name: notify\n    type: slack.postMessage\n',
  valid: true,
};

export const useFetchWorkflow = (_id?: string, _isEnabled?: boolean) =>
  ({ data: MOCK_WORKFLOW, isLoading: false, isFetching: false } as UseQueryResult<
    WorkflowDetailDto,
    Error
  >);
