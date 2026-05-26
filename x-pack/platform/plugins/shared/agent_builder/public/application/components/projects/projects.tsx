/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { ProjectsTable } from './projects_table';
import { LinkCaseModal } from './link_case_modal';

export const AgentBuilderProjects = () => {
  const { euiTheme } = useEuiTheme();
  const { write: canWrite } = useUiPrivileges();
  const [isLinkCaseModalOpen, setIsLinkCaseModalOpen] = useState(false);
  const [focusProjectId, setFocusProjectId] = useState<string | null>(null);

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderProjectsPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.projects.pageTitle', {
          defaultMessage: 'Projects',
        })}
        description={i18n.translate('xpack.agentBuilder.projects.pageDescription', {
          defaultMessage:
            'Workspaces that group Agent Builder conversations. Case-typed projects link to Cases and surface projected case knowledge for chat context.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          canWrite && (
            <EuiButton
              key="link-case"
              fill
              iconType="link"
              onClick={() => setIsLinkCaseModalOpen(true)}
              data-test-subj="agentBuilderLinkCaseButton"
            >
              {i18n.translate('xpack.agentBuilder.projects.linkCaseButton', {
                defaultMessage: 'Link case',
              })}
            </EuiButton>
          ),
        ]}
      />
      <KibanaPageTemplate.Section>
        <ProjectsTable
          focusProjectId={focusProjectId}
          onFocusProjectHandled={() => setFocusProjectId(null)}
        />
      </KibanaPageTemplate.Section>
      <LinkCaseModal
        isOpen={isLinkCaseModalOpen}
        onClose={() => setIsLinkCaseModalOpen(false)}
        onLinked={(projectId) => setFocusProjectId(projectId)}
      />
    </KibanaPageTemplate>
  );
};
