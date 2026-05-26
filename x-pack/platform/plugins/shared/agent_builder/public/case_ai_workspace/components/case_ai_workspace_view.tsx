/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { CaseAiWorkspaceProps } from '@kbn/agent-builder-browser';
import { ProjectType } from '@kbn/agent-builder-common';
import { queryKeys } from '../../application/query_keys';
import { useAgentBuilderServices } from '../../application/hooks/use_agent_builder_service';
import { useCreateProjectFromCase } from '../../application/hooks/projects/use_create_project_from_case';
import { KnowledgePanel } from './knowledge_panel';
import { ConversationsPanel } from './conversations_panel';
import type { AgentBuilderInternalService } from '../../services';
import { CaseConversationPanel } from './case_conversation_panel';

export interface CaseAiWorkspaceViewProps extends CaseAiWorkspaceProps {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

export const CaseAiWorkspaceView: React.FC<CaseAiWorkspaceViewProps> = ({
  services,
  coreStart,
  caseId,
  caseTitle,
  caseOwner,
  caseDescription,
  totalAlerts,
  totalComments,
  fileCount,
}) => {
  const { euiTheme } = useEuiTheme();
  const { projectsService } = useAgentBuilderServices();
  const { linkCaseToProject, isLinking } = useCreateProjectFromCase();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [conversationEpoch, setConversationEpoch] = useState(0);

  const { data: projects, isLoading: isLoadingProjects, refetch } = useQuery({
    queryKey: queryKeys.projects.list({ caseId }),
    queryFn: () => projectsService.list({ type: ProjectType.case, case_id: caseId }),
  });

  const project = projects?.[0];

  const enableWorkspace = useCallback(async () => {
    await linkCaseToProject({
      case_id: caseId,
      owner: caseOwner,
      title: caseTitle,
    });
    await refetch();
  }, [caseId, caseOwner, caseTitle, linkCaseToProject, refetch]);

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(undefined);
    setConversationEpoch((epoch) => epoch + 1);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setConversationEpoch((epoch) => epoch + 1);
  }, []);

  const sessionTag = useMemo(() => `case-ai-workspace-${caseId}`, [caseId]);

  const layoutStyles = css`
    min-height: 520px;
    border: 1px solid ${euiTheme.border.color};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  if (isLoadingProjects) {
    return (
      <EuiPanel hasBorder data-test-subj="caseAiWorkspaceLoading">
        <EuiLoadingSpinner size="l" />
      </EuiPanel>
    );
  }

  if (!project) {
    return (
      <EuiPanel hasBorder data-test-subj="caseAiWorkspaceEnable">
        <EuiEmptyPrompt
          iconType="sparkles"
          title={
            <h2>
              {i18n.translate('xpack.agentBuilder.caseAiWorkspace.enableTitle', {
                defaultMessage: 'No AI Workspace yet for this case',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.agentBuilder.caseAiWorkspace.enableDescription', {
                defaultMessage:
                  'Enable AI Workspace to investigate this case with AI. Case context, alerts, and description are loaded automatically.',
              })}
            </p>
          }
          actions={
            <EuiButton
              fill
              iconType="sparkles"
              onClick={() => void enableWorkspace()}
              isLoading={isLinking}
              data-test-subj="caseAiWorkspaceEnableButton"
            >
              {i18n.translate('xpack.agentBuilder.caseAiWorkspace.enableButton', {
                defaultMessage: 'Enable AI Workspace',
              })}
            </EuiButton>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <div css={layoutStyles} data-test-subj="caseAiWorkspace">
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={css`
            width: 300px;
            border-right: 1px solid ${euiTheme.border.color};
            background: ${euiTheme.colors.backgroundBaseSubdued};
            padding: ${euiTheme.size.m};
          `}
        >
          <KnowledgePanel
            caseTitle={caseTitle}
            caseDescription={caseDescription}
            totalAlerts={totalAlerts}
            totalComments={totalComments}
            fileCount={fileCount}
            projectId={project.id}
            updatedAt={project.updated_at}
            onRefresh={() => void refetch()}
          />
          <EuiSpacer size="m" />
          <ConversationsPanel
            conversationIds={project.conversation_ids}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CaseConversationPanel
            key={`${conversationEpoch}-${selectedConversationId ?? 'new'}`}
            services={services}
            coreStart={coreStart}
            caseId={caseId}
            caseOwner={caseOwner}
            caseTitle={caseTitle}
            caseDescription={caseDescription}
            projectId={project.id}
            sessionTag={sessionTag}
            conversationId={selectedConversationId}
            isNewConversation={selectedConversationId === undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
