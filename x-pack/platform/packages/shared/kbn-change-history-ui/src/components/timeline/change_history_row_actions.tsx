/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import * as i18n from './translations';

interface ChangeHistoryRowActionsProps {
  onCompareToVersion?: () => void;
  onRestoreVersion?: () => void;
}

const ChangeHistoryRowActions = ({
  onCompareToVersion,
  onRestoreVersion,
}: ChangeHistoryRowActionsProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const items = [
      ...(onCompareToVersion
        ? [
            {
              name: i18n.ROW_ACTIONS_COMPARE_TO_THIS_VERSION,
              icon: 'diff' as const,
              onClick: () => {
                setIsOpen(false);
                onCompareToVersion();
              },
              'data-test-subj': 'changeHistoryCompareToThisVersion',
            },
          ]
        : []),
      ...(onRestoreVersion
        ? [
            {
              name: i18n.ROW_ACTIONS_RESTORE_THIS_VERSION,
              icon: 'undo' as const,
              onClick: () => {
                setIsOpen(false);
                onRestoreVersion();
              },
              'data-test-subj': 'changeHistoryRestoreThisVersion',
            },
          ]
        : []),
    ];

    return [{ id: 0, items }];
  }, [onCompareToVersion, onRestoreVersion]);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip content={i18n.ROW_ACTIONS_ARIA_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={i18n.ROW_ACTIONS_ARIA_LABEL}
            size="s"
            color="text"
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj="changeHistoryRowActionsButton"
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

interface RenderDefaultChangeHistoryRowActionsArgs {
  item: ChangeHistoryListItem;
  requestCompareToVersion?: () => void;
  requestRestoreVersion?: () => void;
}

export const renderDefaultChangeHistoryRowActions = ({
  item,
  requestCompareToVersion,
  requestRestoreVersion,
}: RenderDefaultChangeHistoryRowActionsArgs): JSX.Element | null => {
  if (item.isCurrent) {
    return null;
  }

  if (!requestCompareToVersion && !requestRestoreVersion) {
    return null;
  }

  return (
    <ChangeHistoryRowActions
      onCompareToVersion={requestCompareToVersion}
      onRestoreVersion={requestRestoreVersion}
    />
  );
};
