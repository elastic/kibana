/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { css } from '@emotion/react';
import moment from 'moment';
import { labels } from '../../../utils/i18n';
import { resolveOwnerLabel } from '../../../utils/owner';
import { useOwnerProfiles } from '../../../hooks/use_owner_profiles';
import { AgentAvatar } from '../../common/agent_avatar';
import { AgentAccessControlModeBadge } from '../list/agent_access_control_mode_badge';
import { AgentTypeBadge, isPreconfiguredAgentType } from '../list/agent_type_badge';
import { AgentDescription } from './agent_description';
import { accessSummaryManageButton } from '../access/access_i18n';

const { agentOverview: overviewLabels } = labels;

export interface AgentHeaderProps {
  agent: AgentDefinition;
  docsUrl?: string;
  canEditAgent: boolean;
  onEditDetails: () => void;
  canManageAccess?: boolean;
  onManageAccess?: () => void;
}

export const AgentHeader: React.FC<AgentHeaderProps> = ({
  agent,
  docsUrl,
  canEditAgent,
  onEditDetails,
  canManageAccess,
  onManageAccess,
}) => {
  const { euiTheme } = useEuiTheme();
  const agentList = useMemo(() => [agent], [agent]);
  const profileMap = useOwnerProfiles(agentList);

  const textSubduedStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const dividerStyles = css`
    width: 1px;
    height: 12px;
    background-color: ${euiTheme.colors.borderBaseSubdued};
    margin: 0 ${euiTheme.size.m};
    flex-shrink: 0;
    align-self: center;
  `;

  const byAuthorLabel = resolveOwnerLabel(agent.created_by, profileMap);
  const lastUpdatedByLabel = resolveOwnerLabel(agent.updated_by, profileMap);
  const createdAtRelative = agent.created_at ? moment(agent.created_at).fromNow() : undefined;
  const createdAtAbsolute = agent.created_at ? moment(agent.created_at).format('LL LT') : undefined;
  const updatedAtRelative = agent.updated_at ? moment(agent.updated_at).fromNow() : undefined;
  const updatedAtAbsolute = agent.updated_at ? moment(agent.updated_at).format('LL LT') : undefined;

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <AgentAvatar agent={agent} size="xl" iconSize="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiTitle size="l">
                <h1>{agent.name}</h1>
              </EuiTitle>
              <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {`${overviewLabels.createdBy} `}
                    {byAuthorLabel ?? <em>{overviewLabels.unknown}</em>}
                    {createdAtRelative && (
                      <EuiToolTip content={createdAtAbsolute}>
                        <span tabIndex={0}>{`, ${createdAtRelative}`}</span>
                      </EuiToolTip>
                    )}
                  </EuiText>
                </EuiFlexItem>

                {lastUpdatedByLabel && (
                  <>
                    <span css={dividerStyles} aria-hidden="true" />
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {`${overviewLabels.updatedBy} `}
                        {lastUpdatedByLabel}
                        {updatedAtRelative && (
                          <EuiToolTip content={updatedAtAbsolute}>
                            <span tabIndex={0}>{`, ${updatedAtRelative}`}</span>
                          </EuiToolTip>
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </>
                )}
                <span css={dividerStyles} aria-hidden="true" />
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="s">
                        {overviewLabels.agentId(agent.id)}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} css={textSubduedStyles}>
                      <EuiCopy textToCopy={agent.id}>
                        {(copy) => (
                          <EuiToolTip
                            content={overviewLabels.copyIdAriaLabel}
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              iconType="copy"
                              onClick={copy}
                              size="xs"
                              aria-label={overviewLabels.copyIdAriaLabel}
                              data-test-subj="agentOverviewCopyId"
                              css={textSubduedStyles}
                              {...getEbtProps({
                                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                                action: AGENT_BUILDER_UI_EBT.action.agentOverview.COPY_ID,
                                detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
                              })}
                            />
                          </EuiToolTip>
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <span css={dividerStyles} aria-hidden="true" />
                <EuiFlexItem grow={false}>
                  <AgentAccessControlModeBadge agent={agent} />
                </EuiFlexItem>
                {isPreconfiguredAgentType(agent.type) && (
                  <EuiFlexItem grow={false}>
                    <AgentTypeBadge agentType={agent.type} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {docsUrl && (
              <EuiButtonEmpty
                href={docsUrl}
                target="_blank"
                iconType="question"
                size="s"
                data-test-subj="agentOverviewDocsLink"
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.agentOverview.DOCS_LINK,
                  detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
                })}
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
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.agentOverview.EDIT_DETAILS,
                  detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
                })}
              >
                {overviewLabels.editDetailsButton}
              </EuiButtonEmpty>
            )}
            {canManageAccess && onManageAccess && (
              <EuiButtonEmpty
                iconType="lockOpen"
                size="s"
                onClick={onManageAccess}
                data-test-subj="agentOverviewManageAccessButton"
              >
                {accessSummaryManageButton}
              </EuiButtonEmpty>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <AgentDescription description={agent.description} />

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
      <EuiSpacer size="m" />
    </>
  );
};
