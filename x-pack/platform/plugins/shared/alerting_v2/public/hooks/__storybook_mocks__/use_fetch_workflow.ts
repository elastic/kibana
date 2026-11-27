/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import type { WorkflowDetailDto } from '@kbn/workflows';

const toMockWorkflow = (id: string): WorkflowDetailDto => ({
  id,
  name: `Workflow ${id}`,
  description: `Storybook workflow ${id}`,
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'storybook',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'storybook',
  definition: null,
  yaml: '',
  valid: true,
});

export const useFetchWorkflow = (id: string | undefined) =>
  ({
    data: id ? toMockWorkflow(id) : undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as UseQueryResult<WorkflowDetailDto, Error>);
