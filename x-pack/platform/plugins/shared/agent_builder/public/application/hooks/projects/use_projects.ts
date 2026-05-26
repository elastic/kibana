/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { ProjectType } from '@kbn/agent-builder-common';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface UseProjectsOptions {
  type?: ProjectType;
  caseId?: string;
}

export const useProjects = ({ type, caseId }: UseProjectsOptions = {}) => {
  const { projectsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const filters = { type, caseId };
  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectsService.list({ type, case_id: caseId }),
  });

  useEffect(() => {
    if (isError) {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.projects.loadProjectsErrorToast', {
          defaultMessage: 'Unable to load projects',
        }),
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [isError, error, addErrorToast]);

  return {
    projects: data ?? [],
    isLoading,
    error,
    isError,
    refetch,
  };
};
