/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { CreateAiIndexButton } from './components/create_ai_index_button';
import { AiIndexCards } from './components/ai_index_cards';

export const ContextLandingPage = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <KibanaPageTemplate data-test-subj="contextLandingPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.contextEngine.landing.title', {
          defaultMessage: 'Context',
        })}
        description={i18n.translate('xpack.contextEngine.landing.description', {
          defaultMessage:
            'Manage AI Indexes to organize and retrieve contextual knowledge for your agents.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[<CreateAiIndexButton key="create-ai-index-button" />]}
      />
      <KibanaPageTemplate.Section>
        <AiIndexCards />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
