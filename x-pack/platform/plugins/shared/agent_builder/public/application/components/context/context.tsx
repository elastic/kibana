/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { CONTEXT_ENGINE_PATHS } from '@kbn/context-engine-plugin/common/paths';
import { useNavigation } from '../../hooks/use_navigation';
import { labels } from '../../utils/i18n';
import { ContextCallout } from './context_callout';
import { ContextTable } from './context_table';

export const AgentBuilderContext: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { createContextEngineUrl } = useNavigation();

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderContextPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.context.title}
        description={labels.context.pageDescription}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiText size="s" key="manage-ai-indexes-link">
            <EuiLink
              href={createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing)}
              data-test-subj="agentBuilderManageAiIndexesLink"
            >
              {labels.context.manageInContextArea}
            </EuiLink>
          </EuiText>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <ContextCallout />
        <EuiSpacer size="l" />
        <ContextTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
