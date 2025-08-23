/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { type AgentDefinition } from '@kbn/onechat-common';
import { useAgentDelete } from '../../../hooks/agents/use_agent_delete';
import { useKibana } from '../../../hooks/use_kibana';

interface AgentDeleteModalProps {
  agent: AgentDefinition | null;
  onClose: () => void;
}

export const AgentDeleteModal: React.FC<AgentDeleteModalProps> = ({ agent, onClose }) => {
  const {
    services: { notifications },
  } = useKibana();

  const modalTitleId = useGeneratedHtmlId({ prefix: 'agentDeleteModalTitle' });

  const { deleteAgent, isDeleting } = useAgentDelete({
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.onechat.agents.deleteSuccessMessage', {
          defaultMessage: 'Agent deleted successfully',
        })
      );
      onClose();
    },
    onError: (err: Error) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.onechat.agents.deleteErrorMessage', {
          defaultMessage: 'Failed to delete agent',
        }),
        text: formatOnechatErrorMessage(err),
      });
    },
  });

  if (!agent) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} role="alertdialog">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.onechat.agents.deleteModal.title"
            defaultMessage="Delete {name}"
            values={{ name: agent.name }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.onechat.agents.deleteModal.description"
              defaultMessage="Are you sure you want to delete this agent? This action cannot be undone."
            />
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isDeleting}>
          <FormattedMessage
            id="xpack.onechat.agents.deleteModal.cancelButton"
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
          data-test-subj="onechatAgentDeleteConfirmButton"
        >
          <FormattedMessage
            id="xpack.onechat.agents.deleteModal.confirmButton"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
