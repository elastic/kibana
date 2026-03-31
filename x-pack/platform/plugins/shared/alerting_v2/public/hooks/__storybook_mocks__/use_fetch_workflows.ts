/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import type { WorkflowListDto } from '@kbn/workflows';

const MOCK_WORKFLOWS: WorkflowListDto = {
  page: 1,
  size: 100,
  total: 3,
  results: [
    {
      id: 'workflow-1',
      name: 'Slack notification workflow',
      description: 'Sends alerts to Slack',
      enabled: true,
      definition: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      history: [],
      valid: true,
    },
    {
      id: 'workflow-2',
      name: 'PagerDuty escalation workflow',
      description: 'Escalates to PagerDuty',
      enabled: true,
      definition: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      history: [],
      valid: true,
    },
    {
      id: 'workflow-3',
      name: 'Email digest workflow',
      description: 'Sends email digests',
      enabled: true,
      definition: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      history: [],
      valid: true,
    },
  ],
};

export const useFetchWorkflows = () =>
  ({ data: MOCK_WORKFLOWS, isLoading: false } as UseQueryResult<WorkflowListDto, Error>);
