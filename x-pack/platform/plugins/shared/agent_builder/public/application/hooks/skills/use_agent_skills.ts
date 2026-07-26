/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useAgentSkills = ({ agentId }: { agentId?: string } = {}) => {
  const { addErrorToast } = useToasts();
  const { skillsService } = useAgentBuilderServices();

  const { data, isLoading, error, isError } = useQuery({
    enabled: Boolean(agentId),
    queryKey: queryKeys.skills.byAgent(agentId),
    queryFn: () => {
      if (!agentId) {
        throw new Error('Agent id is required');
      }
      return skillsService.listByAgent({ agentId });
    },
  });

  useEffect(() => {
    if (isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.skills.loadSkillsErrorToast,
        text: formattedError,
      });
    }
  }, [isError, error, addErrorToast]);

  return {
    skills: data ?? [],
    isLoading,
    error,
    isError,
  };
};
