/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useEuiTheme, useEuiOverflowScroll } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EvaluationsSidebar } from './evaluations_sidebar';
import { useConversationList } from '../../hooks/use_conversation_list';
import { EvaluationsHeader } from './header/evaluations_header';
import { Evaluation } from './evaluation';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import { EvaluationsProvider } from '../../context/evaluations/evaluations_context';

export const OnechatEvaluationsView: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { euiTheme } = useEuiTheme();
  const { conversations = [], isLoading } = useConversationList();
  const scrollStyles = css`
    ${useEuiOverflowScroll('y')}
  `;

  const mainStyles = css`
    border: none;
  `;
  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const sidebarStyles = css`
    ${backgroundStyles}
    max-block-size: calc(var(--kbn-application--content-height));
    padding: 0;
  `;
  const headerHeight = `calc(${euiTheme.size.xl} * 2)`;
  const headerStyles = css`
    ${backgroundStyles}
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: none;
    block-size: ${headerHeight};
  `;
  const contentStyles = css`
    ${backgroundStyles}
    ${scrollStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
    overflow-y: auto;
  `;

  const labels = {
    header: i18n.translate('xpack.onechat.evaluationsView.header', {
      defaultMessage: 'Evaluations header',
    }),
    content: i18n.translate('xpack.onechat.evaluationsView.content', {
      defaultMessage: 'Evaluation content',
    }),
  };

  return (
    <SendMessageProvider>
      <EvaluationsProvider>
        <KibanaPageTemplate
          offset={0}
          restrictWidth={false}
          data-test-subj="onechatPageEvaluations"
          grow={false}
          panelled={false}
          mainProps={{
            css: mainStyles,
          }}
          responsive={[]}
        >
          {isSidebarOpen && (
            <KibanaPageTemplate.Sidebar data-test-subj="evaluationsSidebar" css={sidebarStyles}>
              <EvaluationsSidebar conversations={conversations} isLoading={isLoading} />
            </KibanaPageTemplate.Sidebar>
          )}

          <KibanaPageTemplate.Header
            css={headerStyles}
            bottomBorder={false}
            aria-label={labels.header}
            paddingSize="m"
          >
            <EvaluationsHeader
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => {
                setIsSidebarOpen((open) => !open);
              }}
            />
          </KibanaPageTemplate.Header>
          <KibanaPageTemplate.Section
            paddingSize="none"
            grow
            contentProps={{
              css: contentStyles,
            }}
            aria-label={labels.content}
          >
            <Evaluation />
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </EvaluationsProvider>
    </SendMessageProvider>
  );
};
