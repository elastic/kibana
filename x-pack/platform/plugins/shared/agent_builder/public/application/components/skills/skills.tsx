/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { AgentBuilderSkillsTable } from './skills_table';

export const AgentBuilderSkills = () => {
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { manageTools } = useUiPrivileges();

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderSkillsPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.skills.title}
        description={i18n.translate('xpack.agentBuilder.skills.skillsDescription', {
          defaultMessage:
            'Skills define reusable instructions and tool sets that agents use to perform specific tasks. Built-in skills cover common operations, and you can create your own for custom workflows.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          manageTools && (
            <EuiButton
              key="new-skill-button"
              fill
              iconType="plus"
              onClick={() => navigateToAgentBuilderUrl(appPaths.skills.new)}
              data-test-subj="agentBuilderNewSkillButton"
            >
              <EuiText size="s">{labels.skills.newSkillButton}</EuiText>
            </EuiButton>
          ),
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderSkillsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
