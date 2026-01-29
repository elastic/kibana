/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { labels } from '../../utils/i18n';
import { AgentBuilderPromptsTable } from './table/prompts_table';
import { PromptFormModal } from './prompt_form_modal';

export const AgentBuilderPrompts = () => {
  const { euiTheme } = useEuiTheme();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderPromptsPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.prompts.title}
        description={
          <FormattedMessage
            id="xpack.agentBuilder.prompts.promptsDescription"
            defaultMessage="Prompts are reusable templates that help guide agent behavior and responses. Create custom prompts to standardize interactions and improve consistency across your agents."
          />
        }
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="new-prompt-button"
            fill
            iconType="plus"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <EuiText size="s">{labels.prompts.newPromptButtonLabel}</EuiText>
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderPromptsTable />
      </KibanaPageTemplate.Section>
      <PromptFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </KibanaPageTemplate>
  );
};
