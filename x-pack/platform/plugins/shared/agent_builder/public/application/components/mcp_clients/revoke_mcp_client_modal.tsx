/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useRevokeOAuthClient } from '../../hooks/oauth_clients/use_revoke_oauth_client';
import { useToasts } from '../../hooks/use_toasts';
import { labels } from '../../utils/i18n';

export interface RevokeMcpClientModalProps {
  clientId: string;
  clientName: string;
  connectionCount: number;
  onClose: () => void;
}

export const RevokeMcpClientModal = ({
  clientId,
  clientName,
  connectionCount,
  onClose,
}: RevokeMcpClientModalProps) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const { revokeOAuthClient, isRevoking } = useRevokeOAuthClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'revokeMcpClientModalTitle' });

  const isConfirmed = confirmationInput === clientName;

  const handleRevoke = useCallback(async () => {
    try {
      await revokeOAuthClient({ clientId });
      addSuccessToast({
        title: labels.tools.mcpClients.revoke.successToast(clientName),
      });
      onClose();
    } catch (error) {
      addErrorToast({
        title: labels.tools.mcpClients.revoke.errorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [revokeOAuthClient, clientId, clientName, onClose, addSuccessToast, addErrorToast]);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="mcpClientRevokeModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {labels.tools.mcpClients.revoke.title(clientName)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={labels.tools.mcpClients.revoke.warningTitle}
        >
          <FormattedMessage
            id="xpack.agentBuilder.mcpClients.revoke.warningDescription"
            defaultMessage="The {name} MCP client has <bold>{count} application {count, plural, one {connection} other {connections}}</bold> detected."
            values={{
              name: clientName,
              count: connectionCount,
              bold: (chunks) => <strong>{chunks}</strong>,
            }}
          />
        </EuiCallOut>
        <EuiSpacer size="l" />
        <EuiFormRow label={labels.tools.mcpClients.revoke.confirmLabel(clientName)} fullWidth>
          <EuiFieldText
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder={labels.tools.mcpClients.revoke.confirmPlaceholder}
            data-test-subj="mcpClientRevokeConfirmInput"
            fullWidth
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {labels.tools.mcpClients.revoke.cancelButton}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={handleRevoke}
          isLoading={isRevoking}
          disabled={!isConfirmed || isRevoking}
          data-test-subj="mcpClientRevokeConfirmButton"
        >
          {labels.tools.mcpClients.revoke.revokeButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
