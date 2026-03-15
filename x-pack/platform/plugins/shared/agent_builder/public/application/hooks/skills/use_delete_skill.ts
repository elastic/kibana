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
import type { DeleteSkillResponse } from '../../../../common/http_api/skills';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface DeleteSkillMutationVariables {
  skillId: string;
}

type DeleteSkillMutationOptions = UseMutationOptions<
  DeleteSkillResponse,
  Error,
  DeleteSkillMutationVariables
>;

type DeleteSkillSuccessCallback = NonNullable<DeleteSkillMutationOptions['onSuccess']>;
type DeleteSkillErrorCallback = NonNullable<DeleteSkillMutationOptions['onError']>;

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
    mutationFn: ({ skillId }) => skillsService.delete({ skillId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
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
  const onConfirmCallbackRef = useRef<() => void>();
  const onCancelCallbackRef = useRef<() => void>();

  const isModalOpen = deleteSkillId !== null;

  const deleteSkill = useCallback(
    (
      skillId: string,
      { onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void } = {}
    ) => {
      setDeleteSkillId(skillId);
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
  };

  const handleError: DeleteSkillErrorCallback = (error, { skillId }) => {
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
    onCancelCallbackRef.current?.();
    onCancelCallbackRef.current = undefined;
  }, []);

  return {
    isOpen: isModalOpen,
    isLoading,
    skillId: deleteSkillId,
    deleteSkill,
    confirmDelete,
    cancelDelete,
  };
};
