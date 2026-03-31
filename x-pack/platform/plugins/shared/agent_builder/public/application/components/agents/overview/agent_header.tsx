/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { AgentAvatar } from '../../common/agent_avatar';
import { AgentVisibilityBadge } from '../list/agent_visibility_badge';

const { agentOverview: overviewLabels } = labels;

export interface AgentHeaderProps {
  agent: AgentDefinition;
  docsUrl?: string;
  canEditAgent: boolean;
  onEditDetails: () => void;
}

export const AgentHeader: React.FC<AgentHeaderProps> = ({
  agent,
  docsUrl,
  canEditAgent,
  onEditDetails,
}) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <AgentAvatar agent={agent} size="xl" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiTitle size="l">
            <h1>{agent.name}</h1>
          </EuiTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            {agent.created_by?.username && (
              <EuiText size="s" color="subdued">
                {overviewLabels.byAuthor(agent.created_by.username)}
              </EuiText>
            )}
            <EuiCopy textToCopy={agent.id}>
              {(copy) => (
                <EuiButtonEmpty
                  size="xs"
                  iconType="copy"
                  onClick={copy}
                  flush="left"
                  data-test-subj="agentOverviewCopyId"
                >
                  {overviewLabels.agentId(agent.id)}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
            <AgentVisibilityBadge agent={agent} />
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {docsUrl && (
            <EuiButtonEmpty
              href={docsUrl}
              target="_blank"
              iconType="documents"
              size="s"
              data-test-subj="agentOverviewDocsLink"
            >
              {overviewLabels.docsLink}
            </EuiButtonEmpty>
          )}
          {canEditAgent && (
            <EuiButtonEmpty
              iconType="pencil"
              size="s"
              onClick={onEditDetails}
              data-test-subj="agentOverviewEditDetailsButton"
            >
              {overviewLabels.editDetailsButton}
            </EuiButtonEmpty>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      {agent.description}
    </EuiText>

    {agent.labels && agent.labels.length > 0 && (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {agent.labels.map((label) => (
            <EuiBadge key={label} color="hollow">
              {label}
            </EuiBadge>
          ))}
        </EuiFlexGroup>
      </>
    )}
  </>
);
