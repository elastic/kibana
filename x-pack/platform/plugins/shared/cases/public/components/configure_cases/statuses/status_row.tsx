/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { getStatusBadgeProps } from '../../status/use_case_statuses';
import * as i18n from './translations';

export interface StatusRowProps {
  status: CaseStatusDefinition;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: (status: CaseStatusDefinition) => void;
  onMove: (key: string, direction: 'up' | 'down') => void;
  onSetDefault: (key: string) => void;
  onToggleDisabled: (key: string) => void;
}

const StatusRowComponent: React.FC<StatusRowProps> = ({
  status,
  disabled,
  canMoveUp,
  canMoveDown,
  onEdit,
  onMove,
  onSetDefault,
  onToggleDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const runAndClose = (run: () => void) => () => {
    closeMenu();
    run();
  };
  const testSubj = `case-status-${status.key}`;

  const menuItems = [
    <EuiContextMenuItem
      key="edit"
      icon="pencil"
      onClick={runAndClose(() => onEdit(status))}
      data-test-subj={`${testSubj}-edit`}
    >
      {i18n.EDIT}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="setDefault"
      icon="check"
      disabled={status.isDefault || status.disabled}
      toolTipContent={status.disabled ? i18n.ENABLE_FIRST : undefined}
      onClick={runAndClose(() => onSetDefault(status.key))}
      data-test-subj={`${testSubj}-set-default`}
    >
      {i18n.SET_AS_DEFAULT}
    </EuiContextMenuItem>,
    status.disabled ? (
      <EuiContextMenuItem
        key="enable"
        icon="eye"
        onClick={runAndClose(() => onToggleDisabled(status.key))}
        data-test-subj={`${testSubj}-enable`}
      >
        {i18n.ENABLE}
      </EuiContextMenuItem>
    ) : (
      <EuiContextMenuItem
        key="disable"
        icon="eyeClosed"
        disabled={status.isDefault}
        toolTipContent={status.isDefault ? i18n.CANNOT_DISABLE_DEFAULT : undefined}
        onClick={runAndClose(() => onToggleDisabled(status.key))}
        data-test-subj={`${testSubj}-disable`}
      >
        {i18n.DISABLE}
      </EuiContextMenuItem>
    ),
  ];

  return (
    <div
      css={css`
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${euiTheme.border.thin};
      `}
      data-test-subj={`case-status-row-${status.key}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <Status {...getStatusBadgeProps(status)} dataTestSubj={`${testSubj}-badge`} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.CATEGORY_LABELS[status.category]}
          </EuiText>
        </EuiFlexItem>
        {status.isDefault && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj={`${testSubj}-default-badge`}>
              {i18n.DEFAULT_BADGE}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} />
        {!status.disabled && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.MOVE_UP} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="sortUp"
                  aria-label={i18n.MOVE_UP}
                  isDisabled={disabled || !canMoveUp}
                  onClick={() => onMove(status.key, 'up')}
                  data-test-subj={`${testSubj}-move-up`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.MOVE_DOWN} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="sortDown"
                  aria-label={i18n.MOVE_DOWN}
                  isDisabled={disabled || !canMoveDown}
                  onClick={() => onMove(status.key, 'down')}
                  data-test-subj={`${testSubj}-move-down`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.ACTIONS_FOR(status.label)}
            button={
              <EuiToolTip content={i18n.ACTIONS_FOR(status.label)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="ellipsis"
                  aria-label={i18n.ACTIONS_FOR(status.label)}
                  isDisabled={disabled}
                  onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                  data-test-subj={`${testSubj}-actions`}
                />
              </EuiToolTip>
            }
            isOpen={isMenuOpen}
            closePopover={closeMenu}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

StatusRowComponent.displayName = 'StatusRow';

export const StatusRow = React.memo(StatusRowComponent);
