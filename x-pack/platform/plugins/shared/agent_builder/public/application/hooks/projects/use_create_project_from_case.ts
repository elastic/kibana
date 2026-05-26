/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { Project } from '@kbn/agent-builder-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { CreateProjectFromCaseBody } from '../../../../common/http_api/projects';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useCreateProjectFromCase = () => {
  const queryClient = useQueryClient();
  const { projectsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const { mutateAsync, isLoading } = useMutation<Project, Error, CreateProjectFromCaseBody>({
    mutationFn: (body) => projectsService.getOrCreateForCase(body),
    onSuccess: (project) => {
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.projects.linkCaseSuccessToast', {
          defaultMessage: 'Case linked to project',
        }),
        text: project.title,
      });
    },
    onError: (error) => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.projects.linkCaseErrorToast', {
          defaultMessage: 'Unable to link case to project',
        }),
        text: formatAgentBuilderErrorMessage(error),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });

  return { linkCaseToProject: mutateAsync, isLinking: isLoading };
};
