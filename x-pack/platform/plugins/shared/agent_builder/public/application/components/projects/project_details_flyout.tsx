/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProjectType } from '@kbn/agent-builder-common';
import { useProject } from '../../hooks/projects/use_project';
import { useKibana } from '../../hooks/use_kibana';
import { getCaseViewUrl } from '../../utils/get_case_view_url';

export interface ProjectDetailsFlyoutProps {
  projectId: string | null;
  onClose: () => void;
}

export const ProjectDetailsFlyout = ({ projectId, onClose }: ProjectDetailsFlyoutProps) => {
  const {
    services: { application },
  } = useKibana();
  const { project, knowledge, isLoading } = useProject(projectId ?? undefined);

  if (!projectId) {
    return null;
  }

  const caseRef = project?.case_ref;
  const caseUrl =
    caseRef &&
    getCaseViewUrl({
      application,
      caseId: caseRef.case_id,
      owner: caseRef.owner,
    });

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="agentBuilderProjectDetailsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 data-test-subj="agentBuilderProjectDetailsFlyoutTitle">
            {project?.title ??
              i18n.translate('xpack.agentBuilder.projects.detailsFlyout.loadingTitle', {
                defaultMessage: 'Project details',
              })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <>
            <EuiDescriptionList
              compressed
              listItems={[
                {
                  title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.id', {
                    defaultMessage: 'ID',
                  }),
                  description: project?.id,
                },
                {
                  title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.type', {
                    defaultMessage: 'Type',
                  }),
                  description: project?.type,
                },
                {
                  title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.space', {
                    defaultMessage: 'Space',
                  }),
                  description: project?.space,
                },
                {
                  title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.updated', {
                    defaultMessage: 'Updated',
                  }),
                  description: project?.updated_at
                    ? new Date(project.updated_at).toLocaleString()
                    : undefined,
                },
                {
                  title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.conversations', {
                    defaultMessage: 'Conversations',
                  }),
                  description: String(project?.conversation_ids.length ?? 0),
                },
              ]}
            />
            {project?.type === ProjectType.case && caseRef && (
              <>
                <EuiSpacer size="l" />
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.agentBuilder.projects.detailsFlyout.linkedCase', {
                      defaultMessage: 'Linked case',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiDescriptionList
                  compressed
                  listItems={[
                    {
                      title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.caseId', {
                        defaultMessage: 'Case ID',
                      }),
                      description: caseUrl ? (
                        <EuiLink href={caseUrl} data-test-subj="agentBuilderProjectCaseLink">
                          {caseRef.case_id}
                        </EuiLink>
                      ) : (
                        caseRef.case_id
                      ),
                    },
                    {
                      title: i18n.translate('xpack.agentBuilder.projects.detailsFlyout.caseOwner', {
                        defaultMessage: 'Owner',
                      }),
                      description: caseRef.owner,
                    },
                  ]}
                />
                {knowledge && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiDescriptionList
                      compressed
                      listItems={[
                        {
                          title: i18n.translate(
                            'xpack.agentBuilder.projects.detailsFlyout.caseTitle',
                            { defaultMessage: 'Case title' }
                          ),
                          description: knowledge.title,
                        },
                        {
                          title: i18n.translate(
                            'xpack.agentBuilder.projects.detailsFlyout.caseStatus',
                            { defaultMessage: 'Status' }
                          ),
                          description: knowledge.status,
                        },
                        {
                          title: i18n.translate(
                            'xpack.agentBuilder.projects.detailsFlyout.caseSeverity',
                            { defaultMessage: 'Severity' }
                          ),
                          description: knowledge.severity,
                        },
                        {
                          title: i18n.translate(
                            'xpack.agentBuilder.projects.detailsFlyout.caseAlerts',
                            { defaultMessage: 'Alerts' }
                          ),
                          description: knowledge.total_alerts,
                        },
                        {
                          title: i18n.translate(
                            'xpack.agentBuilder.projects.detailsFlyout.caseComments',
                            { defaultMessage: 'Comments' }
                          ),
                          description: knowledge.total_comments,
                        },
                      ]}
                    />
                  </>
                )}
              </>
            )}
            {project && project.conversation_ids.length > 0 && (
              <>
                <EuiSpacer size="l" />
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.agentBuilder.projects.detailsFlyout.conversationIds', {
                      defaultMessage: 'Conversation IDs',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiCodeBlock language="json" isCopyable>
                  {JSON.stringify(project.conversation_ids, null, 2)}
                </EuiCodeBlock>
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
