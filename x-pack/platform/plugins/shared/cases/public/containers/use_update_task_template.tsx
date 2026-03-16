/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { updateTaskTemplate } from './api';
import type { UpdateTaskTemplateRequest } from './api';
import { casesMutationsKeys, casesQueriesKeys } from './constants';

interface UpdateTaskTemplateParams {
  templateId: string;
  request: UpdateTaskTemplateRequest;
}

export const useUpdateTaskTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation(
    casesMutationsKeys.updateTaskTemplate,
    ({ templateId, request }: UpdateTaskTemplateParams) => updateTaskTemplate(templateId, request),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.taskTemplates);
      },
    }
  );
};
