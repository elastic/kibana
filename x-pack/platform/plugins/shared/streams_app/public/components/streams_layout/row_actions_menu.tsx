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
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';

interface RowActionsMenuProps {
  /** Human-readable name of the row entity, used for the accessible label. */
  entityName: string;
  /** Tooltip of the trigger button, e.g. "Source actions". */
  tooltip: string;
  buttonTestSubj: string;
  deleteTestSubj: string;
  onShowOnCanvas: () => void;
  onDelete: () => void;
}

/** Ellipsis row menu shared by the Sources and Destinations tables. */
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

  return (
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
            key="showOnCanvas"
            icon="waypoint"
            onClick={() => {
              closePopover();
              onShowOnCanvas();
            }}
            data-test-subj="streamsShowOnCanvasAction"
          >
            {i18n.translate('xpack.streams.streamsLayout.showOnCanvasMenuItemLabel', {
              defaultMessage: 'Show on canvas',
            })}
          </EuiContextMenuItem>,
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
  );
};
