/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, euiTextBreakWord, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { useKibana } from '../../../../hooks/use_kibana';

const linkStyles = css`
  ${euiTextBreakWord()}
`;

interface ExternalLinkModalProps {
  url: string | null;
  onClose: () => void;
}

export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({ url, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'externalLinkModal' });
  const {
    services: { analytics },
  } = useKibana();

  const handleConfirm = useCallback(() => {
    if (url === null) return;
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.pageContent,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.EXTERNAL_LINK_CONFIRM,
      element_kind: 'button',
    });
    window.open(url, '_blank', 'noreferrer');
    onClose();
  }, [analytics, url, onClose]);

  const handleCancel = useCallback(() => {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.pageContent,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.EXTERNAL_LINK_CANCEL,
      element_kind: 'button',
    });
    onClose();
  }, [analytics, onClose]);

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
      onCancel={handleCancel}
      onConfirm={handleConfirm}
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
            url: <strong css={linkStyles}>{url}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
