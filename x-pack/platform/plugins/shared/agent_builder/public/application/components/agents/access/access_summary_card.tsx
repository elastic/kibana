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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { useAgentAcl } from '../../../hooks/agents/use_agent_acl';
import { useCanManageAgentAccess } from '../../../hooks/agents/use_can_manage_agent_access';
import {
  accessSummaryCardTitle,
  accessSummaryCount,
  accessSummaryDefaultDescription,
  accessSummaryHiddenDescription,
  accessSummaryManageButton,
} from './access_i18n';

interface AccessSummaryCardProps {
  agent: AgentDefinition;
  onManage: () => void;
}

export const AccessSummaryCard: React.FC<AccessSummaryCardProps> = ({ agent, onManage }) => {
  const { canManage } = useCanManageAgentAccess(agent);
  const { data, isLoading } = useAgentAcl(agent.id, { enabled: canManage });

  const userCount = data?.acl.entries.filter((e) => e.type === 'user').length ?? 0;
  const roleCount = data?.acl.entries.filter((e) => e.type === 'role').length ?? 0;
  const hasCustom = userCount + roleCount > 0;

  let description = accessSummaryDefaultDescription;
  if (!canManage) {
    // Without management rights we hide counts and identities to avoid info disclosure.
    description = hasCustom ? accessSummaryHiddenDescription : accessSummaryDefaultDescription;
  } else if (hasCustom) {
    description = accessSummaryCount(userCount, roleCount);
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="agentBuilderAclSummaryCard">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="lockOpen" size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiTitle size="xxs">
                <h4>{accessSummaryCardTitle}</h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {isLoading && canManage ? '…' : description}
          </EuiText>
        </EuiFlexItem>
        {canManage ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="gear"
              onClick={onManage}
              data-test-subj="agentBuilderAclManageButton"
            >
              {accessSummaryManageButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
