/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';

export const ROW_ACTIONS_COLUMN_WIDTH = 72;

const SHOW_ON_CANVAS_LABEL = i18n.translate('xpack.streams.streamsLayout.showOnCanvasTooltip', {
  defaultMessage: 'Show on canvas',
});

interface RowActionsMenuProps {
  entityName: string;
  tooltip: string;
  buttonTestSubj: string;
  deleteTestSubj: string;
  onShowOnCanvas: () => void;
  onDelete: () => void;
}

export const RowActionsMenu = ({
  entityName,
  tooltip,
  buttonTestSubj,
  deleteTestSubj,
  onShowOnCanvas,
  onDelete,
}: RowActionsMenuProps) => {
  const [isOpen, { off: closePopover, toggle }] = useBoolean(false);
  const actionsLabel = i18n.translate('xpack.streams.streamsLayout.rowActionsAriaLabel', {
    defaultMessage: 'Open actions for {entityName}',
    values: { entityName },
  });
  const showOnCanvasLabel = i18n.translate(
    'xpack.streams.streamsLayout.showOnCanvasButtonAriaLabel',
    {
      defaultMessage: 'Show {entityName} on canvas',
      values: { entityName },
    }
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiToolTip content={SHOW_ON_CANVAS_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="waypoint"
          onClick={onShowOnCanvas}
          aria-label={showOnCanvasLabel}
          data-test-subj="streamsShowOnCanvasAction"
        />
      </EuiToolTip>
      <EuiPopover
        aria-label={actionsLabel}
        button={
          <EuiToolTip content={tooltip} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="ellipsis"
              onClick={toggle}
              aria-label={actionsLabel}
              data-test-subj={buttonTestSubj}
            />
          </EuiToolTip>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="leftUp"
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="delete"
              icon="trash"
              onClick={() => {
                closePopover();
                onDelete();
              }}
              data-test-subj={deleteTestSubj}
            >
              {i18n.translate('xpack.streams.streamsLayout.deleteMenuItemLabel', {
                defaultMessage: 'Delete',
              })}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    </EuiFlexGroup>
  );
};
