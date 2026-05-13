/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToken,
  EuiToolTip,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { agentBuilderDefaultAgentId, type AgentDefinition } from '@kbn/agent-builder-common';
import { useAgentAcl } from '../../../hooks/agents/use_agent_acl';
import { useCanManageAgentAccess } from '../../../hooks/agents/use_can_manage_agent_access';
import { ROLE_LABEL } from './role_to_capabilities';
import {
  accessSummaryCardTitle,
  accessSummaryCount,
  accessSummaryDefaultDescription,
  accessSummaryHiddenDescription,
  accessSummaryLoading,
  accessSummaryManageButton,
} from './access_i18n';

interface AccessSummaryCardProps {
  agent: AgentDefinition;
  onManage: () => void;
}

const PRINCIPAL_PREVIEW_LIMIT = 4;

const cardStyles = (euiTheme: EuiThemeComputed) => css`
  padding: ${euiTheme.size.m} ${euiTheme.size.l};
`;

const tokenStackStyles = (euiTheme: EuiThemeComputed) => css`
  display: inline-flex;
  align-items: center;
  > * + * {
    margin-left: -${euiTheme.size.xs};
  }
`;

export const AccessSummaryCard: React.FC<AccessSummaryCardProps> = ({ agent, onManage }) => {
  const { euiTheme } = useEuiTheme();
  const isDefaultAgent = agent.id === agentBuilderDefaultAgentId;
  const { canManage } = useCanManageAgentAccess(agent);
  // Skip the network call entirely on the default agent — there's nothing to render.
  const { data, isLoading } = useAgentAcl(agent.id, { enabled: canManage && !isDefaultAgent });

  // V1: only user-type entries exist. The filter is a defensive cast in case stale
  // role entries linger in storage from PoC data — they'll be hidden until V2 lands.
  const userCount = data?.acl.entries.filter((e) => e.type === 'user').length ?? 0;
  const hasCustom = userCount > 0;

  const previewEntries = useMemo(
    () => (data?.acl.entries ?? []).slice(0, PRINCIPAL_PREVIEW_LIMIT),
    [data]
  );
  const overflow = (data?.acl.entries.length ?? 0) - previewEntries.length;

  if (isDefaultAgent) {
    return null;
  }

  const renderDescription = () => {
    if (isLoading && canManage) {
      return (
        <EuiText size="s" color="subdued">
          {accessSummaryLoading}
        </EuiText>
      );
    }
    if (!canManage) {
      return (
        <EuiText size="s" color="subdued">
          {hasCustom ? accessSummaryHiddenDescription : accessSummaryDefaultDescription}
        </EuiText>
      );
    }
    if (!hasCustom) {
      return (
        <EuiText size="s" color="subdued">
          {accessSummaryDefaultDescription}
        </EuiText>
      );
    }
    return (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <div css={tokenStackStyles(euiTheme)} aria-hidden>
              {previewEntries.map((entry) => (
                <EuiToolTip
                  key={`${entry.type}:${entry.name}`}
                  content={`${entry.name} — ${ROLE_LABEL[entry.role]}`}
                >
                  <EuiToken
                    iconType="tokenUser"
                    shape="circle"
                    color="euiColorVis1"
                    size="s"
                  />
                </EuiToolTip>
              ))}
              {overflow > 0 ? (
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    margin-left: ${euiTheme.size.s};
                  `}
                >
                  +{overflow} more
                </EuiText>
              ) : null}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {accessSummaryCount(userCount)}
        </EuiText>
      </>
    );
  };

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={cardStyles(euiTheme)}
      data-test-subj="agentBuilderAclSummaryCard"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow>
          <EuiText size="xs" color="subdued">
            {accessSummaryCardTitle}
          </EuiText>
          <EuiSpacer size="xs" />
          {renderDescription()}
        </EuiFlexItem>
        {canManage ? (
          <EuiFlexItem grow={false}>
            {hasCustom ? (
              <EuiButtonEmpty
                size="s"
                iconType="gear"
                onClick={onManage}
                data-test-subj="agentBuilderAclManageButton"
              >
                {accessSummaryManageButton}
              </EuiButtonEmpty>
            ) : (
              // No custom entries yet — promote the action to a primary outline button so
              // the empty state has a clear next step.
              <EuiButton
                size="s"
                iconType="lockOpen"
                onClick={onManage}
                data-test-subj="agentBuilderAclManageButton"
              >
                {accessSummaryManageButton}
              </EuiButton>
            )}
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
