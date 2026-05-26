/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useProject = (projectId?: string) => {
  const { projectsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error, isError } = useQuery({
    enabled: Boolean(projectId),
    queryKey: queryKeys.projects.byId(projectId),
    queryFn: () => projectsService.get(projectId!),
  });

  useEffect(() => {
    if (projectId && isError) {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.projects.loadProjectErrorToast', {
          defaultMessage: 'Unable to load project',
        }),
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [isError, error, projectId, addErrorToast]);

  return {
    project: data?.project,
    knowledge: data?.knowledge,
    isLoading,
    error,
    isError,
  };
};
