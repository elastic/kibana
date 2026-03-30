/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface ExternalLinkModalProps {
  url: string | null;
  onClose: () => void;
}

export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({ url, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'externalLinkModal' });

  if (url === null) return null;

  return (
    <EuiConfirmModal
      maxWidth="400px"
      aria-labelledby={titleId}
      title={
        <FormattedMessage
          id="xpack.agentBuilder.chatMessage.externalLinkModal.title"
          defaultMessage="Open external link"
        />
      }
      titleProps={{ id: titleId }}
      onCancel={onClose}
      onConfirm={() => {
        window.open(url, '_blank', 'noreferrer');
        onClose();
      }}
      cancelButtonText={
        <FormattedMessage
          id="xpack.agentBuilder.chatMessage.externalLinkModal.cancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.agentBuilder.chatMessage.externalLinkModal.confirmButton"
          defaultMessage="Open in new tab"
        />
      }
      defaultFocusedButton="confirm"
    >
      <p>
        <FormattedMessage
          id="xpack.agentBuilder.chatMessage.externalLinkModal.description"
          defaultMessage="You are about to navigate to an external site:{lineBreak}{url}"
          values={{
            lineBreak: <br />,
            url: <strong>{url}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
