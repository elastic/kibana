/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
// import { useConversationList } from '../../hooks/use_conversation_list';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import { EvaluationsProvider } from '../../context/evaluations/evaluations_context';
// import { appPaths } from '../../utils/app_paths';
// import { useNavigation } from '../../hooks/use_navigation';

export const OnechatEvaluationsHistoryView: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  //   const { createOnechatUrl } = useNavigation();
  //   const { conversations = [], isLoading } = useConversationList();

  return (
    <SendMessageProvider>
      <EvaluationsProvider>
        <KibanaPageTemplate data-test-subj="agentBuilderEvaluationHistoryPage">
          <KibanaPageTemplate.Header
            pageTitle={<h1>Title</h1>}
            description={<p>Description</p>}
            css={css`
              background-color: ${euiTheme.colors.backgroundBasePlain};
              border-block-end: none;
            `}
            // rightSideItems={[
            //   <EuiButton fill href={createOnechatUrl(appPaths.root)}>
            //     <EuiText size="s">Return to chat</EuiText>
            //   </EuiButton>,
            // ]}
          />
          <KibanaPageTemplate.Section>
            <p>Main section</p>
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </EvaluationsProvider>
    </SendMessageProvider>
  );
};
