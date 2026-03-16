/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { createTaskTemplate } from './api';
import type { CreateTaskTemplateRequest } from './api';
import { casesMutationsKeys, casesQueriesKeys } from './constants';

export const useCreateTaskTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation(
    casesMutationsKeys.createTaskTemplate,
    (request: CreateTaskTemplateRequest) => createTaskTemplate(request),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.taskTemplates);
      },
    }
  );
};
