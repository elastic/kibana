/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CASE_STATUS_CATEGORY_LABELS } from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import { ICONS } from '../../icons';
import { StatusLabelBadge } from '../queue/status_label_badge';
import * as i18n from './translations';

export interface StatusRowProps {
  status: CaseStatusConfiguration;
  /** False for users without the Cases settings privilege. */
  canEdit: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Only one enabled status left in the category: it cannot be disabled. */
  isOnlyEnabled: boolean;
  onEdit: (status: CaseStatusConfiguration) => void;
  onSetDefault: (status: CaseStatusConfiguration) => void;
  onMove: (status: CaseStatusConfiguration, direction: 'up' | 'down') => void;
  onToggleDisabled: (status: CaseStatusConfiguration) => void;
}

const getSetDefaultTooltip = (status: CaseStatusConfiguration): string | undefined => {
  if (status.disabled) return i18n.TOOLTIP_ENABLE_FIRST;
  if (status.pausesTimeTracking) return i18n.TOOLTIP_PAUSING_NOT_DEFAULT;
  return undefined;
};

const getDisableTooltip = (
  status: CaseStatusConfiguration,
  isOnlyEnabled: boolean
): string | undefined => {
  if (status.isDefault) return i18n.TOOLTIP_SET_ANOTHER_DEFAULT;
  if (isOnlyEnabled) return i18n.TOOLTIP_NEEDS_ONE_ENABLED;
  return undefined;
};

/** One status of a category: its badges and the menu of what can be done to it. */
export const StatusRow: React.FC<StatusRowProps> = ({
  status,
  canEdit,
  canMoveUp,
  canMoveDown,
  isOnlyEnabled,
  onEdit,
  onSetDefault,
  onMove,
  onToggleDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationStatusActions' });
  const categoryLabel = CASE_STATUS_CATEGORY_LABELS[status.category];

  const run = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  const setDefaultTooltip = getSetDefaultTooltip(status);
  const isSetDefaultDisabled = status.isDefault || status.disabled || !!status.pausesTimeTracking;
  const disableTooltip = getDisableTooltip(status, isOnlyEnabled);
  const isDisableBlocked = !status.disabled && (status.isDefault || isOnlyEnabled);

  const items = [
    <EuiContextMenuItem
      key="edit"
      onClick={run(() => onEdit(status))}
      data-test-subj={`investigationStatusEdit-${status.key}`}
    >
      {i18n.ACTION_EDIT}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="default"
      disabled={isSetDefaultDisabled}
      toolTipContent={isSetDefaultDisabled ? setDefaultTooltip : undefined}
      onClick={run(() => onSetDefault(status))}
      data-test-subj={`investigationStatusSetDefault-${status.key}`}
    >
      {i18n.ACTION_SET_DEFAULT}
    </EuiContextMenuItem>,
    ...(canMoveUp
      ? [
          <EuiContextMenuItem
            key="up"
            onClick={run(() => onMove(status, 'up'))}
            data-test-subj={`investigationStatusMoveUp-${status.key}`}
          >
            {i18n.ACTION_MOVE_UP}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(canMoveDown
      ? [
          <EuiContextMenuItem
            key="down"
            onClick={run(() => onMove(status, 'down'))}
            data-test-subj={`investigationStatusMoveDown-${status.key}`}
          >
            {i18n.ACTION_MOVE_DOWN}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      key="toggle"
      disabled={isDisableBlocked}
      toolTipContent={isDisableBlocked ? disableTooltip : undefined}
      onClick={run(() => onToggleDisabled(status))}
      data-test-subj={`investigationStatusToggle-${status.key}`}
    >
      {status.disabled ? i18n.ACTION_ENABLE : i18n.ACTION_DISABLE}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${euiTheme.border.thin};
      `}
      data-test-subj={`investigationStatusRow-${status.key}`}
    >
      <EuiFlexItem grow={false}>
        <StatusLabelBadge
          label={status.label}
          category={status.category}
          data-test-subj={`investigationStatusBadge-${status.key}`}
        />
      </EuiFlexItem>
      {status.pausesTimeTracking ? (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType={ICONS.paused}
            data-test-subj={`investigationStatusPauses-${status.key}`}
          >
            {i18n.PAUSES_TIME_TRACKING}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
      {status.isDefault ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.DEFAULT_FOR_CATEGORY_TOOLTIP(categoryLabel)}>
            <EuiBadge
              color="hollow"
              tabIndex={0}
              data-test-subj={`investigationStatusDefault-${status.key}`}
            >
              {i18n.DEFAULT_FOR_CATEGORY(categoryLabel)}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow />
      {canEdit ? (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={popoverId}
            aria-label={i18n.ROW_ACTIONS_ARIA(status.label)}
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            button={
              <EuiToolTip content={i18n.ROW_ACTIONS_ARIA(status.label)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.menu}
                  aria-label={i18n.ROW_ACTIONS_ARIA(status.label)}
                  onClick={() => setIsOpen((open) => !open)}
                  data-test-subj={`investigationStatusActions-${status.key}`}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
StatusRow.displayName = 'StatusRow';
