/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { MAX_CASE_PAUSE_REASONS } from '../../../../common/constants';
import * as i18n from './translations';

export interface PauseReasonsProps {
  reasons: string[];
  /** Whether any enabled status pauses time tracking; the last reason cannot go then */
  hasPausingStatus: boolean;
  disabled: boolean;
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (reason: string) => void;
  onMove: (reason: string, direction: 'up' | 'down') => void;
  onRemove: (reason: string) => void;
}

const PauseReasonRow: React.FC<{
  reason: string;
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onEdit: PauseReasonsProps['onEdit'];
  onMove: PauseReasonsProps['onMove'];
  onRemove: PauseReasonsProps['onRemove'];
}> = ({ reason, disabled, isFirst, isLast, canRemove, onEdit, onMove, onRemove }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const runAndClose = (run: () => void) => () => {
    closePopover();
    run();
  };

  return (
    <div
      css={css`
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${euiTheme.border.thin};
      `}
      data-test-subj={`case-pause-reason-row-${reason}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiText size="s">{reason}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.ACTIONS_FOR_REASON(reason)}
            button={
              <EuiToolTip content={i18n.ACTIONS_FOR_REASON(reason)} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="boxesVertical"
                  aria-label={i18n.ACTIONS_FOR_REASON(reason)}
                  disabled={disabled}
                  onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
                  data-test-subj={`case-pause-reason-${reason}-actions`}
                />
              </EuiToolTip>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="edit"
                  icon="pencil"
                  onClick={runAndClose(() => onEdit(reason))}
                  data-test-subj={`case-pause-reason-${reason}-edit`}
                >
                  {i18n.EDIT}
                </EuiContextMenuItem>,
                ...(isFirst
                  ? []
                  : [
                      <EuiContextMenuItem
                        key="moveUp"
                        icon="sortUp"
                        onClick={runAndClose(() => onMove(reason, 'up'))}
                        data-test-subj={`case-pause-reason-${reason}-move-up`}
                      >
                        {i18n.MOVE_UP}
                      </EuiContextMenuItem>,
                    ]),
                ...(isLast
                  ? []
                  : [
                      <EuiContextMenuItem
                        key="moveDown"
                        icon="sortDown"
                        onClick={runAndClose(() => onMove(reason, 'down'))}
                        data-test-subj={`case-pause-reason-${reason}-move-down`}
                      >
                        {i18n.MOVE_DOWN}
                      </EuiContextMenuItem>,
                    ]),
                <EuiContextMenuItem
                  key="remove"
                  icon="trash"
                  disabled={!canRemove}
                  toolTipContent={canRemove ? undefined : i18n.CANNOT_REMOVE_LAST_REASON}
                  onClick={runAndClose(() => onRemove(reason))}
                  data-test-subj={`case-pause-reason-${reason}-remove`}
                >
                  {i18n.REMOVE}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

PauseReasonRow.displayName = 'PauseReasonRow';

const PauseReasonsComponent: React.FC<PauseReasonsProps> = ({
  reasons,
  hasPausingStatus,
  disabled,
  isLoading,
  onAdd,
  onEdit,
  onMove,
  onRemove,
}) => (
  <div data-test-subj="case-pause-reasons">
    <EuiSpacer size="m" />
    <EuiTitle size="xs">
      <h3>{i18n.PAUSE_REASONS_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s" color="subdued">
      {i18n.PAUSE_REASONS_DESCRIPTION}
    </EuiText>
    <EuiSpacer size="s" />
    {reasons.map((reason, index) => (
      <PauseReasonRow
        key={reason}
        reason={reason}
        disabled={disabled}
        isFirst={index === 0}
        isLast={index === reasons.length - 1}
        canRemove={!(hasPausingStatus && reasons.length === 1)}
        onEdit={onEdit}
        onMove={onMove}
        onRemove={onRemove}
      />
    ))}
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        {reasons.length < MAX_CASE_PAUSE_REASONS ? (
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            isLoading={isLoading}
            isDisabled={disabled}
            onClick={onAdd}
            data-test-subj="case-pause-reasons-add"
          >
            {i18n.ADD_REASON}
          </EuiButtonEmpty>
        ) : (
          <EuiText size="xs" color="subdued" data-test-subj="case-pause-reasons-limit">
            {i18n.MAX_REASONS(MAX_CASE_PAUSE_REASONS)}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

PauseReasonsComponent.displayName = 'PauseReasons';

export const PauseReasons = React.memo(PauseReasonsComponent);
