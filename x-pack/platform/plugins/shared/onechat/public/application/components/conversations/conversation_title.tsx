/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiTitle, EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationTitle } from '../../hooks/use_conversation';

export const ConversationTitle: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { title, isLoading } = useConversationTitle();

  const [previousTitle, setPreviousTitle] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');

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

  useEffect(() => {
    if (isLoading) return;

    const fullText = title || labels.newConversationDisplay;

    // Typewriter effect: only when transitioning from "New conversation" to actual title
    if (previousTitle === labels.newConversationDisplay && title) {
      if (currentText.length < fullText.length) {
        // start typewriter effect
        const typingSpeed = 50;
        const timeout = setTimeout(() => {
          setCurrentText(fullText.substring(0, currentText.length + 1));
        }, typingSpeed);

        return () => clearTimeout(timeout);
      }
    } else if (title && title !== previousTitle) {
      // Normal title change: set immediately without typewriter effect I.e. when changing from one conversation to another
      setCurrentText(fullText);
    }
    // always track the previous title
    setPreviousTitle(fullText);
  }, [title, currentText, labels.newConversationDisplay, isLoading, previousTitle]);

  const titleDisplayText = currentText || previousTitle;

  const sectionStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
  `;

  return (
    <EuiPageHeaderSection css={sectionStyles}>
      {!isLoading && (
        <EuiTitle
          aria-label={labels.ariaLabel}
          size="xxs"
          data-test-subj="agentBuilderConversationTitle"
        >
          <h1>{titleDisplayText}</h1>
        </EuiTitle>
      )}
    </EuiPageHeaderSection>
  );
};
