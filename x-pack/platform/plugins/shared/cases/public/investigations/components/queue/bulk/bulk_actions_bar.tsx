/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CaseStatusConfiguration } from '../../../../../common/investigations/statuses';
import { ICONS } from '../../../icons';
import {
  STATUS_LIST_WIDTH,
  STATUS_ROW_HEIGHT,
  getStatusListHeight,
  toStatusOptions,
} from '../../detail/status_control';
import * as i18n from './translations';

export type BulkDialogKind = 'assign' | 'priority' | 'tags' | 'close';

export interface BulkActionsBarProps {
  count: number;
  /** The statuses a selection can move to: everything except the closed category. */
  statuses: CaseStatusConfiguration[];
  canAssign: boolean;
  onOpenDialog: (kind: BulkDialogKind) => void;
  onPickStatus: (statusKey: string) => void;
  onClear: () => void;
}

/** What the people working the queue can do to the selected investigations at once. */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  count,
  statuses,
  canAssign,
  onOpenDialog,
  onPickStatus,
  onClear,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const options = useMemo<EuiSelectableOption[]>(() => toStatusOptions(statuses, ''), [statuses]);

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePrimary};
      `}
      role="toolbar"
      aria-label={i18n.BAR_LABEL}
      data-test-subj="investigationBulkBar"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="investigationBulkCount">
            <strong>{i18n.SELECTED(count)}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            isDisabled={!canAssign}
            onClick={() => onOpenDialog('assign')}
            data-test-subj="investigationBulkAssignButton"
          >
            {i18n.ASSIGN}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isStatusOpen}
            closePopover={() => setIsStatusOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            aria-label={i18n.STATUS_LIST_LABEL}
            button={
              <EuiButtonEmpty
                size="s"
                iconType={ICONS.chevronDown}
                iconSide="right"
                onClick={() => setIsStatusOpen((open) => !open)}
                data-test-subj="investigationBulkStatusButton"
              >
                {i18n.CHANGE_STATUS}
              </EuiButtonEmpty>
            }
          >
            <div
              css={css`
                inline-size: ${STATUS_LIST_WIDTH};
              `}
            >
              <EuiSelectable
                aria-label={i18n.STATUS_LIST_LABEL}
                singleSelection="always"
                options={options}
                onChange={(next) => {
                  const key = next.find((option) => option.checked === 'on')?.key;
                  setIsStatusOpen(false);
                  if (key) {
                    onPickStatus(key);
                  }
                }}
                listProps={{ rowHeight: STATUS_ROW_HEIGHT, showIcons: false }}
                height={getStatusListHeight(options)}
                data-test-subj="investigationBulkStatusList"
              >
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => onOpenDialog('priority')}
            data-test-subj="investigationBulkPriorityButton"
          >
            {i18n.CHANGE_PRIORITY}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => onOpenDialog('tags')}
            data-test-subj="investigationBulkTagsButton"
          >
            {i18n.ADD_TAGS}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => onOpenDialog('close')}
            data-test-subj="investigationBulkCloseButton"
          >
            {i18n.CLOSE}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.close}
            onClick={onClear}
            data-test-subj="investigationBulkClear"
          >
            {i18n.CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
BulkActionsBar.displayName = 'BulkActionsBar';
