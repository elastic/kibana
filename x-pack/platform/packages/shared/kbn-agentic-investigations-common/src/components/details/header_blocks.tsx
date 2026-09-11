/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { InfoBlocks, type InfoBlockItem } from '@kbn/flyout-info-blocks';
import type { Investigation } from '../../types';
import { AssignActionModal } from '../modals/assign_action_modal';
import { TEMPLATE_UI_LABELS } from '../../template_ui/translations';

export interface InvestigationHeaderBlocksProps {
  investigation: Investigation;
  /** Statuses offered in the status menu. The current status is omitted from the list. */
  statusOptions: readonly string[];
  /** Omit to render the status read-only. */
  onChangeStatus?: (status: string) => void;
  /** Omit to render the assignee read-only. */
  onChangeAssignee?: (assignee: string) => void;
}

const StatusValue = memo<{
  status?: string;
  statusOptions: readonly string[];
  onChangeStatus?: (status: string) => void;
}>(({ status, statusOptions, onChangeStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const label = status ?? '—';

  if (!onChangeStatus) {
    return <EuiBadge color="hollow">{label}</EuiBadge>;
  }

  // Only moves are actionable, so the current status is not offered.
  const moves = statusOptions.filter((option) => option !== status);

  return (
    <EuiPopover
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={TEMPLATE_UI_LABELS.statusMenuAriaLabel}
      isOpen={isOpen}
      closePopover={closeMenu}
      button={
        <EuiBadge
          color="hollow"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={toggleMenu}
          onClickAriaLabel={TEMPLATE_UI_LABELS.statusMenuAriaLabel}
          data-test-subj="investigationHeaderStatusBadge"
        >
          {label}
        </EuiBadge>
      }
    >
      <EuiContextMenuPanel
        items={moves.map((option) => (
          <EuiContextMenuItem
            key={option}
            onClick={() => {
              closeMenu();
              onChangeStatus(option);
            }}
            data-test-subj={`investigationHeaderStatus-${option}`}
          >
            {option}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
});
StatusValue.displayName = 'StatusValue';

const AssigneeValue = memo<{
  investigation: Investigation;
  onChangeAssignee?: (assignee: string) => void;
}>(({ investigation, onChangeAssignee }) => {
  const { assignee, recordId, id } = investigation;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const onAssign = useCallback(
    (nextAssignee: string) => {
      closeModal();
      onChangeAssignee?.(nextAssignee);
    },
    [closeModal, onChangeAssignee]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {assignee ? (
          <EuiFlexItem grow={false}>
            <EuiAvatar size="s" name={assignee} />
          </EuiFlexItem>
        ) : null}
        {!assignee && !onChangeAssignee ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {TEMPLATE_UI_LABELS.unassigned}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        {onChangeAssignee ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={TEMPLATE_UI_LABELS.assignAriaLabel}
              disableScreenReaderOutput
              display="inlineBlock"
            >
              <EuiButtonIcon
                iconType="plusCircle"
                color="text"
                aria-label={TEMPLATE_UI_LABELS.assignAriaLabel}
                onClick={() => setIsModalOpen(true)}
                data-test-subj="investigationHeaderAssignButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {isModalOpen ? (
        <AssignActionModal
          recordId={recordId ?? id}
          initialAssignee={assignee}
          onClose={closeModal}
          onAssign={onAssign}
        />
      ) : null}
    </>
  );
});
AssigneeValue.displayName = 'AssigneeValue';

/** Status and assignee tiles shown above the flyout tabs. */
export const InvestigationHeaderBlocks = memo<InvestigationHeaderBlocksProps>(
  ({ investigation, statusOptions, onChangeStatus, onChangeAssignee }) => {
    const items = useMemo<InfoBlockItem[]>(
      () => [
        {
          id: 'status',
          title: TEMPLATE_UI_LABELS.status,
          value: (
            <StatusValue
              status={investigation.status}
              statusOptions={statusOptions}
              onChangeStatus={onChangeStatus}
            />
          ),
        },
        {
          id: 'assignees',
          title: TEMPLATE_UI_LABELS.assignees,
          value: (
            <AssigneeValue investigation={investigation} onChangeAssignee={onChangeAssignee} />
          ),
        },
      ],
      [investigation, statusOptions, onChangeStatus, onChangeAssignee]
    );

    return <InfoBlocks items={items} maxColumns={2} data-test-subj="investigationHeaderBlocks" />;
  }
);

InvestigationHeaderBlocks.displayName = 'InvestigationHeaderBlocks';
