/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useConversationTitle } from '../application/hooks/use_conversation';

const labels = {
  ariaLabel: i18n.translate('xpack.agentBuilder.embeddable.conversationHeader.ariaLabel', {
    defaultMessage: 'Conversation title',
  }),
  newConversationDisplay: i18n.translate(
    'xpack.agentBuilder.embeddable.conversationHeader.newConversationDisplay',
    {
      defaultMessage: 'New conversation',
    }
  ),
};

const containerStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

interface EmbeddableConversationHeaderProps {
  onClose: () => void;
  ariaLabelledBy: string;
}

export const EmbeddableConversationHeader: React.FC<EmbeddableConversationHeaderProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const { title, isLoading } = useConversationTitle();

  const titleDisplayText = isLoading ? '' : title || labels.newConversationDisplay;

  return (
    <div css={containerStyles}>
      <EuiTitle
        aria-label={labels.ariaLabel}
        size="xxs"
        data-test-subj="agentBuilderEmbeddableConversationTitle"
      >
        <h1 id={ariaLabelledBy}>{titleDisplayText}</h1>
      </EuiTitle>
      <EuiButtonIcon
        iconType="cross"
        onClick={onClose}
        aria-label={i18n.translate('xpack.agentBuilder.embeddable.conversationHeader.closeLabel', {
          defaultMessage: 'Close',
        })}
      />
    </div>
  );
};
