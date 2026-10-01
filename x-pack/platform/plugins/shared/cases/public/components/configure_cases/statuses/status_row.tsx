/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import type {
  CaseStatusConfiguration,
  CaseStatusesConfiguration,
} from '../../../../common/types/domain';
import { getDisableBlocker } from './utils';
import * as i18n from './translations';

export interface StatusRowProps {
  status: CaseStatusConfiguration;
  statuses: CaseStatusesConfiguration;
  disabled: boolean;
  isFirstInCategory: boolean;
  isLastInCategory: boolean;
  categoryLabel: string;
  onEdit: (key: string) => void;
  onMove: (key: string, direction: 'up' | 'down') => void;
  onSetDefault: (key: string) => void;
  onToggleDisabled: (key: string) => void;
}

const StatusRowComponent: React.FC<StatusRowProps> = ({
  status,
  statuses,
  disabled,
  isFirstInCategory,
  isLastInCategory,
  categoryLabel,
  onEdit,
  onMove,
  onSetDefault,
  onToggleDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const disableBlocker = getDisableBlocker(statuses, status);

  const items = useMemo(() => {
    const runAndClose = (run: () => void) => () => {
      closePopover();
      run();
    };

    return [
      <EuiContextMenuItem
        key="edit"
        icon="pencil"
        onClick={runAndClose(() => onEdit(status.key))}
        data-test-subj={`case-status-${status.key}-edit`}
      >
        {i18n.EDIT}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="setDefault"
        icon="check"
        disabled={status.isDefault || status.disabled}
        toolTipContent={status.disabled ? i18n.ENABLE_FIRST : undefined}
        onClick={runAndClose(() => onSetDefault(status.key))}
        data-test-subj={`case-status-${status.key}-set-default`}
      >
        {i18n.SET_AS_DEFAULT}
      </EuiContextMenuItem>,
      // Disabled statuses are grouped at the end of their category, so order is meaningless there.
      ...(isFirstInCategory || status.disabled
        ? []
        : [
            <EuiContextMenuItem
              key="moveUp"
              icon="sortUp"
              onClick={runAndClose(() => onMove(status.key, 'up'))}
              data-test-subj={`case-status-${status.key}-move-up`}
            >
              {i18n.MOVE_UP}
            </EuiContextMenuItem>,
          ]),
      ...(isLastInCategory || status.disabled
        ? []
        : [
            <EuiContextMenuItem
              key="moveDown"
              icon="sortDown"
              onClick={runAndClose(() => onMove(status.key, 'down'))}
              data-test-subj={`case-status-${status.key}-move-down`}
            >
              {i18n.MOVE_DOWN}
            </EuiContextMenuItem>,
          ]),
      status.disabled ? (
        <EuiContextMenuItem
          key="enable"
          icon="eye"
          onClick={runAndClose(() => onToggleDisabled(status.key))}
          data-test-subj={`case-status-${status.key}-enable`}
        >
          {i18n.ENABLE}
        </EuiContextMenuItem>
      ) : (
        <EuiContextMenuItem
          key="disable"
          icon="eyeClosed"
          disabled={disableBlocker != null}
          toolTipContent={
            disableBlocker === 'default'
              ? i18n.CANNOT_DISABLE_DEFAULT
              : disableBlocker === 'last'
              ? i18n.CANNOT_DISABLE_LAST
              : undefined
          }
          onClick={runAndClose(() => onToggleDisabled(status.key))}
          data-test-subj={`case-status-${status.key}-disable`}
        >
          {i18n.DISABLE}
        </EuiContextMenuItem>
      ),
    ];
  }, [
    closePopover,
    disableBlocker,
    isFirstInCategory,
    isLastInCategory,
    onEdit,
    onMove,
    onSetDefault,
    onToggleDisabled,
    status,
  ]);

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
          <Status status={status.category} label={status.label} />
        </EuiFlexItem>
        {status.isDefault && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.DEFAULT_BADGE_TOOLTIP(categoryLabel)}>
              <EuiBadge
                color="hollow"
                tabIndex={0}
                data-test-subj={`case-status-${status.key}-default-badge`}
              >
                {i18n.DEFAULT_FOR(categoryLabel)}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={true} />
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.ACTIONS_FOR(status.label)}
            button={
              <EuiToolTip content={i18n.ACTIONS_FOR(status.label)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="boxesVertical"
                  aria-label={i18n.ACTIONS_FOR(status.label)}
                  disabled={disabled}
                  onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
                  data-test-subj={`case-status-${status.key}-actions`}
                />
              </EuiToolTip>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

StatusRowComponent.displayName = 'StatusRow';

export const StatusRow = React.memo(StatusRowComponent);
