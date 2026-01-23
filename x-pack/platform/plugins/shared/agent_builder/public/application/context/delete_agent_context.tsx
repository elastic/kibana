/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useCallback, useContext, useState } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import React from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../hooks/use_kibana';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from '../hooks/use_agent_builder_service';

interface UseDeleteAgentMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

function useDeleteAgentMutation({
  onSuccess: handleSuccess,
  onError: handleError,
}: UseDeleteAgentMutationOptions = {}) {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => {
      if (!agentId) {
        throw new Error('Agent ID is required for delete');
      }
      return agentService.delete(agentId);
    },
    onSuccess: (result, agentId) => {
      // Invalidate specific agent and agent profiles list
      queryClient.removeQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      handleSuccess?.();
    },
    onError: (err: Error) => {
      handleError?.(err);
    },
  });

  return deleteAgentMutation;
}

interface AgentDeleteModalProps {
  agent: AgentDefinition | null;
  onSuccess: () => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

const AgentDeleteModal: React.FC<AgentDeleteModalProps> = ({
  agent,
  onSuccess: handleSuccess,
  onError: handleError,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'agentDeleteModalTitle' });

  const { mutate: deleteAgent, isLoading: isDeleting } = useDeleteAgentMutation({
    onSuccess: () => {
      onClose();
      handleSuccess();
    },
    onError: handleError,
  });

  if (!agent) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} role="alertdialog">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.agentBuilder.agents.deleteModal.title"
            defaultMessage="Delete {name}"
            values={{ name: agent.name }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.agents.deleteModal.description"
              defaultMessage="Are you sure you want to delete this agent? This action cannot be undone."
            />
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isDeleting}>
          <FormattedMessage
            id="xpack.agentBuilder.agents.deleteModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          onClick={() => {
            deleteAgent(agent.id);
          }}
          color="danger"
          fill
          isLoading={isDeleting}
          data-test-subj="agentBuilderAgentDeleteConfirmButton"
        >
          <FormattedMessage
            id="xpack.agentBuilder.agents.deleteModal.confirmButton"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface DeleteAgentState {
  deleteAgent: ({
    agent,
    forceWithoutConfirmation,
  }: {
    agent: AgentDefinition;
    forceWithoutConfirmation?: boolean;
  }) => void;
}

const DeleteAgentContext = createContext<DeleteAgentState | null>(null);

interface DeleteAgentProviderProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const DeleteAgentProvider: React.FC<DeleteAgentProviderProps> = ({
  children,
  onSuccess,
  onError,
}) => {
  const {
    services: { notifications },
  } = useKibana();

  const handleSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      i18n.translate('xpack.agentBuilder.agents.deleteSuccessMessage', {
        defaultMessage: 'Agent deleted successfully',
      })
    );
    onSuccess?.();
  }, [onSuccess, notifications]);

  const handleError = useCallback(
    (error: Error) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.agentBuilder.agents.deleteErrorMessage', {
          defaultMessage: 'Failed to delete agent',
        }),
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error);
    },
    [onError, notifications]
  );

  const [deletingAgent, setDeletingAgent] = useState<AgentDefinition | null>(null);
  const deleteAgentMutation = useDeleteAgentMutation({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  return (
    <DeleteAgentContext.Provider
      value={{
        deleteAgent: ({ agent, forceWithoutConfirmation = false }) => {
          if (agent.id === agentBuilderDefaultAgentId) {
            return;
          }

          if (forceWithoutConfirmation) {
            // I don't think it's likely we'll need to use this, we should always show the modal
            deleteAgentMutation.mutate(agent.id);
          } else {
            setDeletingAgent(agent);
          }
        },
      }}
    >
      {children}
      <AgentDeleteModal
        agent={deletingAgent}
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={() => {
          setDeletingAgent(null);
        }}
      />
    </DeleteAgentContext.Provider>
  );
};

export function useDeleteAgent() {
  const context = useContext(DeleteAgentContext);
  if (!context) {
    throw new Error('useDeleteAgent must be used within a DeleteAgentProvider');
  }
  return context;
}
