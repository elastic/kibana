/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { mergeTaskStatusesWithDefaults } from '../../../common/types/domain/task/v1';
import type { TaskStatusDefinition } from '../../../common/types/domain/task/v1';

export type { TaskStatusDefinition };

export const useTaskStatuses = (): TaskStatusDefinition[] => {
  const { data: configuration } = useGetCaseConfiguration();
  return mergeTaskStatusesWithDefaults(configuration?.taskStatuses ?? []);
};
