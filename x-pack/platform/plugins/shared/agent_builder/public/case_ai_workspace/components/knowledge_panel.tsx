/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useProject } from '../../application/hooks/projects/use_project';

export interface KnowledgePanelProps {
  caseTitle: string;
  caseDescription?: string;
  totalAlerts?: number;
  totalComments?: number;
  fileCount?: number;
  projectId: string;
  updatedAt: string;
  onRefresh: () => void;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  caseTitle,
  caseDescription,
  totalAlerts = 0,
  totalComments = 0,
  fileCount = 0,
  projectId,
  updatedAt,
  onRefresh,
}) => {
  const { knowledge } = useProject(projectId);

  const displayTitle = knowledge?.title ?? caseTitle;
  const alertCount = knowledge?.total_alerts ?? totalAlerts;
  const commentCount = knowledge?.total_comments ?? totalComments;

  return (
    <div data-test-subj="caseAiWorkspaceKnowledge">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.agentBuilder.caseAiWorkspace.knowledgeTitle', {
                defaultMessage: 'Knowledge',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" iconType="refresh" onClick={onRefresh}>
            {i18n.translate('xpack.agentBuilder.caseAiWorkspace.refresh', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.agentBuilder.caseAiWorkspace.knowledgeFreshness', {
          defaultMessage:
            '{alertCount, plural, one {# alert} other {# alerts}} loaded · Updated {updated}',
          values: {
            alertCount,
            updated: new Date(updatedAt).toLocaleString(),
          },
        })}
      </EuiText>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="bell" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                {i18n.translate('xpack.agentBuilder.caseAiWorkspace.alertsLoaded', {
                  defaultMessage: '{count, plural, one {# alert loaded} other {# alerts loaded}}',
                  values: { count: alertCount },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {caseDescription ? (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="document" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" className="eui-textTruncate">
                  {displayTitle}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {fileCount > 0 ? (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="paperClip" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate('xpack.agentBuilder.caseAiWorkspace.filesLoaded', {
                    defaultMessage:
                      '{count, plural, one {# file} other {# files}}',
                    values: { count: fileCount },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {commentCount > 0 ? (
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agentBuilder.caseAiWorkspace.commentsSummary', {
                defaultMessage: '{count, plural, one {# comment} other {# comments}} on case',
                values: { count: commentCount },
              })}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};
