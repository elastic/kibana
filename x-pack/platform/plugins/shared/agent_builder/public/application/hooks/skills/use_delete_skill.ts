/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useRef, useState } from 'react';
import type { AgentRef, DeleteSkillResponse } from '../../../../common/http_api/skills';
import { SKILL_USED_BY_AGENTS_ERROR_CODE } from '../../../../common/http_api/skills';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface SkillUsedByAgents {
  skillId: string;
  agents: AgentRef[];
}

interface SkillUsedByAgentsErrorBody {
  attributes?: { code?: string; agents?: SkillUsedByAgents['agents'] };
}

interface DeleteSkillMutationVariables {
  skillId: string;
  force?: boolean;
}

type DeleteSkillMutationOptions = UseMutationOptions<
  DeleteSkillResponse,
  Error,
  DeleteSkillMutationVariables
>;

type DeleteSkillSuccessCallback = NonNullable<DeleteSkillMutationOptions['onSuccess']>;
type DeleteSkillErrorCallback = NonNullable<DeleteSkillMutationOptions['onError']>;

function getSkillUsedByAgentsFromError(error: unknown, skillId: string): SkillUsedByAgents | null {
  const body = (error as { body?: SkillUsedByAgentsErrorBody }).body;
  const attrs = body?.attributes;
  if (attrs?.code !== SKILL_USED_BY_AGENTS_ERROR_CODE || !Array.isArray(attrs.agents)) {
    return null;
  }
  return { skillId, agents: attrs.agents };
}

export const useDeleteSkillService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteSkillSuccessCallback;
  onError?: DeleteSkillErrorCallback;
} = {}) => {
  const queryClient = useQueryClient();
  const { skillsService } = useAgentBuilderServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    DeleteSkillResponse,
    Error,
    DeleteSkillMutationVariables
  >({
    mutationFn: ({ skillId, force }) => skillsService.delete({ skillId, force }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.skills.list }),
    onSuccess,
    onError,
  });

  return { deleteSkillSync: mutate, deleteSkill: mutateAsync, isLoading };
};

export const useDeleteSkill = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteSkillSuccessCallback;
  onError?: DeleteSkillErrorCallback;
} = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null);
  const [usedByAgents, setUsedByAgents] = useState<SkillUsedByAgents | null>(null);
  const onConfirmCallbackRef = useRef<() => void>();
  const onCancelCallbackRef = useRef<() => void>();

  const isModalOpen = deleteSkillId !== null;
  const isForceConfirmModalOpen = usedByAgents !== null;

  const deleteSkill = useCallback(
    (
      skillId: string,
      { onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void } = {}
    ) => {
      setDeleteSkillId(skillId);
      setUsedByAgents(null);
      onConfirmCallbackRef.current = onConfirm;
      onCancelCallbackRef.current = onCancel;
    },
    []
  );

  const handleSuccess: DeleteSkillSuccessCallback = (data, { skillId }) => {
    if (!data.success) {
      addErrorToast({
        title: labels.skills.deleteSkillErrorToast(skillId),
        text: formatAgentBuilderErrorMessage(
          new Error('Delete operation failed. API returned: { success: false }')
        ),
      });
      return;
    }

    addSuccessToast({
      title: labels.skills.deleteSkillSuccessToast(skillId),
    });
    setDeleteSkillId(null);
    setUsedByAgents(null);
  };

  const handleError: DeleteSkillErrorCallback = (error, { skillId }) => {
    const payload = getSkillUsedByAgentsFromError(error, skillId);
    if (payload) {
      setUsedByAgents(payload);
      setDeleteSkillId(null);
      return;
    }
    setUsedByAgents(null);
    addErrorToast({
      title: labels.skills.deleteSkillErrorToast(skillId),
      text: formatAgentBuilderErrorMessage(error),
    });
  };

  const { deleteSkill: deleteSkillMutation, isLoading } = useDeleteSkillService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!deleteSkillId) {
      return;
    }

    await deleteSkillMutation({ skillId: deleteSkillId }, { onSuccess, onError });
    onConfirmCallbackRef.current?.();
    onConfirmCallbackRef.current = undefined;
  }, [deleteSkillId, deleteSkillMutation, onSuccess, onError]);

  const cancelDelete = useCallback(() => {
    setDeleteSkillId(null);
    setUsedByAgents(null);
    onCancelCallbackRef.current?.();
    onCancelCallbackRef.current = undefined;
  }, []);

  const confirmForceDelete = useCallback(async () => {
    if (!usedByAgents) {
      return;
    }
    await deleteSkillMutation(
      { skillId: usedByAgents.skillId, force: true },
      { onSuccess, onError }
    );
    onConfirmCallbackRef.current?.();
    onConfirmCallbackRef.current = undefined;
  }, [usedByAgents, deleteSkillMutation, onSuccess, onError]);

  const cancelForceDelete = useCallback(() => {
    setUsedByAgents(null);
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    skillId: deleteSkillId,
    deleteSkill,
    confirmDelete,
    cancelDelete,
    usedByAgents,
    isForceConfirmModalOpen,
    confirmForceDelete,
    cancelForceDelete,
  };
};
