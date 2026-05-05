/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
  EuiText,
  EuiToken,
  useEuiTheme,
} from '@elastic/eui';
import type { AgentAclEntry, AgentAclRole, AgentVisibility } from '@kbn/agent-builder-common';
import { ROLE_DESCRIPTION, ROLE_LABEL, selectableRolesForVisibility } from './role_to_capabilities';
import {
  accessFlyoutMissingPrincipal,
  accessFlyoutRemoveAriaLabel,
  accessFlyoutRoleAriaLabel,
} from './access_i18n';

interface PrincipalRowProps {
  entry: AgentAclEntry;
  /** Used to constrain the selectable roles for Public/Shared agents. */
  visibility?: AgentVisibility;
  /** True when the named principal cannot be resolved (deleted user/role). */
  missing?: boolean;
  isDisabled?: boolean;
  onChangeRole: (next: AgentAclRole) => void;
  onRemove: () => void;
}

/**
 * One row in the People or Roles section. Layout:
 *
 *   [icon]  [name]                                    [role select ▾]  [✕]
 *           [warning subtext, only when stale]
 */
export const PrincipalRow: React.FC<PrincipalRowProps> = ({
  entry,
  visibility,
  missing,
  isDisabled,
  onChangeRole,
  onRemove,
}) => {
  const { euiTheme } = useEuiTheme();

  const roleOptions = useMemo(() => {
    const allowed = selectableRolesForVisibility(visibility);
    // Always include the entry's existing role even when not in the allowed list,
    // so admins can fix it without it disappearing from the select.
    const includeCurrent = allowed.includes(entry.role) ? allowed : [entry.role, ...allowed];
    return includeCurrent.map((role) => ({
      value: role,
      inputDisplay: ROLE_LABEL[role],
      dropdownDisplay: (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{ROLE_LABEL[role]}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {ROLE_DESCRIPTION[role]}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }));
  }, [entry.role, visibility]);

  const tokenStyles = css`
    flex-shrink: 0;
  `;

  const rowStyles = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
    &:first-of-type {
      border-top: none;
    }
  `;

  return (
    <div css={rowStyles} data-test-subj={`agentBuilderAclRow-${entry.type}-${entry.name}`}>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToken
            css={tokenStyles}
            size="m"
            iconType={entry.type === 'user' ? 'tokenUser' : 'tokenSelector'}
            shape="circle"
            color={
              missing ? 'euiColorVis7' : entry.type === 'user' ? 'euiColorVis1' : 'euiColorVis5'
            }
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiText size="s">
            <strong>{entry.name}</strong>
          </EuiText>
          {missing ? (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              css={css`
                margin-top: ${euiTheme.size.xs};
                color: ${euiTheme.colors.warningText};
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" size="s" color="warning" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="warning">
                  {accessFlyoutMissingPrincipal}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 180px;
          `}
        >
          <EuiSuperSelect<AgentAclRole>
            compressed
            aria-label={accessFlyoutRoleAriaLabel}
            valueOfSelected={entry.role}
            options={roleOptions}
            disabled={isDisabled}
            onChange={(next) => onChangeRole(next)}
            popoverProps={{ panelPaddingSize: 's' }}
            data-test-subj={`agentBuilderAclRoleSelect-${entry.type}-${entry.name}`}
          />
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
    </div>
  );
};
