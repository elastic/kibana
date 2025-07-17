/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface ConversationTitleProps {
  title: string;
}

export const ConversationTitle: React.FC<ConversationTitleProps> = ({ title }) => {
  const { euiTheme } = useEuiTheme();

  const labels = {
    ariaLabel: i18n.translate('xpack.onechat.conversationTitle.ariaLabel', {
      defaultMessage: 'Conversation title',
    }),
    newConversationDisplay: i18n.translate(
      'xpack.onechat.conversationTitle.newConversationDisplay',
      {
        defaultMessage: 'New conversation',
      }
    ),
  };

  const sectionStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
  `;

  return (
    <EuiPageHeaderSection css={sectionStyles}>
      <EuiTitle aria-label={labels.ariaLabel} size="xxs">
        <h1>{title || labels.newConversationDisplay}</h1>
      </EuiTitle>
    </EuiPageHeaderSection>
  );
};
