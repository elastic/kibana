/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSelect,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { type AgentAclEntry, AgentAclRole } from '@kbn/agent-builder-common';
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  selectableRolesForVisibility,
} from './role_to_capabilities';
import {
  accessFlyoutMissingPrincipal,
  accessFlyoutRemoveAriaLabel,
  accessFlyoutRoleAriaLabel,
} from './access_i18n';

interface PrincipalRowProps {
  entry: AgentAclEntry;
  /** Used to constrain the selectable roles for Public/Shared agents. */
  visibility?: import('@kbn/agent-builder-common').AgentVisibility;
  /** True when the named principal cannot be resolved (deleted user/role). */
  missing?: boolean;
  isDisabled?: boolean;
  onChangeRole: (next: AgentAclRole) => void;
  onRemove: () => void;
}

export const PrincipalRow: React.FC<PrincipalRowProps> = ({
  entry,
  visibility,
  missing,
  isDisabled,
  onChangeRole,
  onRemove,
}) => {
  const roleOptions = useMemo(() => {
    const allowed = selectableRolesForVisibility(visibility);
    // Always include the entry's existing role even when not in the allowed list,
    // so admins can fix it without it disappearing from the select.
    const includeCurrent = allowed.includes(entry.role) ? allowed : [entry.role, ...allowed];
    return includeCurrent.map((role) => ({
      value: role,
      text: ROLE_LABEL[role],
    }));
  }, [entry.role, visibility]);

  const icon = entry.type === 'user' ? 'user' : 'users';
  const tooltip = ROLE_DESCRIPTION[entry.role];

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={`agentBuilderAclRow-${entry.type}-${entry.name}`}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <span>{entry.name}</span>
          {missing ? (
            <>
              {' '}
              <EuiBadge color="warning">{accessFlyoutMissingPrincipal}</EuiBadge>
            </>
          ) : null}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={tooltip}>
          <EuiSelect
            compressed
            aria-label={accessFlyoutRoleAriaLabel}
            value={entry.role}
            options={roleOptions}
            disabled={isDisabled}
            onChange={(e) => onChangeRole(e.target.value as AgentAclRole)}
            data-test-subj={`agentBuilderAclRoleSelect-${entry.type}-${entry.name}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="cross"
          color="danger"
          aria-label={accessFlyoutRemoveAriaLabel}
          onClick={onRemove}
          isDisabled={isDisabled}
          data-test-subj={`agentBuilderAclRemove-${entry.type}-${entry.name}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
