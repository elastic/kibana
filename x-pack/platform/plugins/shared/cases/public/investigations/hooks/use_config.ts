/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { ProcedureTemplateTask } from '../../../common/investigations/types';
import {
  getCapabilities,
  getInvestigationTypes,
  getProcedureTemplates,
  updateProcedureTemplate,
} from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const useInvestigationTypes = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.types(), () => getInvestigationTypes(http), {
    staleTime: FIVE_MINUTES_MS,
    retry: false,
  });
};

export const useProcedureTemplates = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.procedureTemplates(), () => getProcedureTemplates(http), {
    staleTime: FIVE_MINUTES_MS,
    retry: false,
  });
};

export const useUpdateProcedureTemplate = () => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation(
    ({ type, tasks }: { type: string; tasks: ProcedureTemplateTask[] }) =>
      updateProcedureTemplate(http, type, { tasks }),
    {
      onSuccess: () => {
        showSuccess(i18n.UPDATE_TEMPLATE_SUCCESS);
        void queryClient.invalidateQueries(investigationKeys.procedureTemplates());
      },
      onError: (error) => showError(error, i18n.UPDATE_TEMPLATE_ERROR),
    }
  );
};

export const useCapabilities = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.capabilities(), () => getCapabilities(http), {
    staleTime: FIVE_MINUTES_MS,
    retry: false,
  });
};
