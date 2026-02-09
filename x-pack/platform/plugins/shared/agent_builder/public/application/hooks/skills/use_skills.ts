/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useSkillsService = () => {
  const { skillsService } = useAgentBuilderServices();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.skills.all,
    queryFn: () => skillsService.list(),
  });

  return { skills: data ?? [], isLoading, error, isError };
};

export const useSkillService = (skillId?: string) => {
  const { skillsService } = useAgentBuilderServices();

  const {
    data: skill,
    isLoading,
    error,
    isError,
  } = useQuery({
    enabled: !!skillId,
    queryKey: queryKeys.skills.byId(skillId),
    // skillId! is safe because of the enabled check above
    queryFn: () => skillsService.get({ skillId: skillId! }),
  });

  return {
    skill: skill as PublicSkillDefinition | undefined,
    isLoading,
    error,
    isError,
  };
};

export interface UseSkillProps {
  skillId?: string;
  onLoadingError?: (error: Error) => void;
}

export const useSkill = ({ skillId, onLoadingError }: UseSkillProps) => {
  const { addErrorToast } = useToasts();
  const { skill, isLoading, error, isError } = useSkillService(skillId);

  useEffect(() => {
    if (skillId && isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.skills.loadSkillErrorToast(skillId),
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, skillId, addErrorToast, onLoadingError]);

  return {
    skill,
    isLoading,
    error,
    isError,
  };
};

export interface UseSkillsWithErrorHandlingProps {
  onLoadingError?: (error: Error) => void;
}

export const useSkills = ({ onLoadingError }: UseSkillsWithErrorHandlingProps = {}) => {
  const { addErrorToast } = useToasts();
  const { skills, isLoading, error, isError } = useSkillsService();

  useEffect(() => {
    if (isError) {
      const formattedError = formatAgentBuilderErrorMessage(error);
      addErrorToast({
        title: labels.skills.loadSkillsErrorToast,
        text: formattedError,
      });
      onLoadingError?.(new Error(formattedError));
    }
  }, [isError, error, addErrorToast, onLoadingError]);

  return {
    skills,
    isLoading,
    error,
    isError,
  };
};
