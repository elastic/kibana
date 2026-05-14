/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, euiTextBreakWord, useGeneratedHtmlId } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useKibana } from '../../../../hooks/use_kibana';
import { reportAgentBuilderUiClick } from '../../../../report_agent_builder_ui_click';

const linkStyles = css`
  ${euiTextBreakWord()}
`;

interface ExternalLinkModalProps {
  url: string | null;
  onClose: () => void;
}

export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({ url, onClose }) => {
  if (url === null) {
    return null;
  }
  return <ExternalLinkModalContent url={url} onClose={onClose} />;
};

interface ExternalLinkModalContentProps {
  url: string;
  onClose: () => void;
}

const ExternalLinkModalContent: React.FC<ExternalLinkModalContentProps> = ({ url, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'externalLinkModal' });
  const {
    services: { analytics },
  } = useKibana();

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
      onCancel={() => {
        reportAgentBuilderUiClick(analytics, {
          ebt_element: AGENT_BUILDER_UI_EBT.element.CONVERSATION_ROUND_RESPONSE,
          ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.EXTERNAL_LINK_CANCEL,
          element_kind: 'button',
        });
        onClose();
      }}
      onConfirm={() => {
        reportAgentBuilderUiClick(analytics, {
          ebt_element: AGENT_BUILDER_UI_EBT.element.CONVERSATION_ROUND_RESPONSE,
          ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.EXTERNAL_LINK_OPEN,
          element_kind: 'button',
        });
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
            url: <strong css={linkStyles}>{url}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
