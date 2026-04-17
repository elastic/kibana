/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../hooks/use_conversation';
import { useToasts } from '../../hooks/use_toasts';

const labels = {
  inputPlaceholder: i18n.translate('xpack.agentBuilder.renameConversationModal.inputPlaceholder', {
    defaultMessage: 'Enter conversation name',
  }),
  renameErrorToast: i18n.translate('xpack.agentBuilder.renameConversationModal.renameErrorToast', {
    defaultMessage: 'Failed to rename conversation',
  }),
};

interface RenameConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RenameConversationModal: React.FC<RenameConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions } = useConversationContext();
  const { addErrorToast } = useToasts();
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync input to current title each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setNewTitle(title || '');
    }
  }, [isOpen, title]);

  const isDirty = newTitle.trim() !== (title || '').trim();

  const handleSave = useCallback(async () => {
    if (!conversationId || !newTitle.trim() || !isDirty) return;
    setIsLoading(true);
    try {
      await conversationActions.renameConversation(conversationId, newTitle.trim());
      onClose();
    } catch (error) {
      addErrorToast({
        title: labels.renameErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, newTitle, isDirty, conversationActions, onClose, addErrorToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') onClose();
    },
    [handleSave, onClose]
  );

  const modalTitleId = useGeneratedHtmlId();

  if (!isOpen || !conversationId) return null;

  return (
    <EuiModal onClose={onClose} maxWidth="360px" aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.agentBuilder.renameConversationModal.title"
            defaultMessage="Rename chat"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFieldText
          fullWidth
          autoFocus
          placeholder={labels.inputPlaceholder}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          data-test-subj="renameConversationModalInput"
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="renameConversationModalCancel">
          <FormattedMessage
            id="xpack.agentBuilder.renameConversationModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleSave}
          isLoading={isLoading}
          isDisabled={!newTitle.trim() || !isDirty}
          data-test-subj="renameConversationModalSave"
        >
          <FormattedMessage
            id="xpack.agentBuilder.renameConversationModal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
