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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';
import { deleteProcessorPromptOptions } from './prompt_options';

const menuLabel = i18n.translate('xpack.streams.processingFlyout.contextMenu.label', {
  defaultMessage: 'Step context menu',
});

interface ProcessorContextMenuProps {
  isDisabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProcessorContextMenu({
  isDisabled,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDuplicate,
  onDelete,
}: ProcessorContextMenuProps) {
  const [isOpen, popover] = useBoolean(false);
  const menuId = useGeneratedHtmlId({ prefix: 'processorContextMenu' });
  const confirmDelete = useDiscardConfirm(onDelete, deleteProcessorPromptOptions);
  const run = (action: () => void) => () => {
    popover.off();
    action();
  };

  return (
    <EuiPopover
      id={menuId}
      aria-label={menuLabel}
      isOpen={isOpen}
      closePopover={popover.off}
      panelPaddingSize="none"
      data-test-subj="streamsProcessingFlyoutStepMenu"
      button={
        <EuiToolTip content={menuLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={menuLabel}
            size="xs"
            iconType="ellipsis"
            disabled={isDisabled}
            onClick={popover.toggle}
            data-test-subj="streamsProcessingFlyoutStepActions"
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="moveUp"
            icon="chevronSingleUp"
            disabled={isFirst}
            onClick={run(onMoveUp)}
            data-test-subj="streamsProcessingFlyoutStepMoveUp"
          >
            {i18n.translate('xpack.streams.processingFlyout.contextMenu.moveUp', {
              defaultMessage: 'Move up',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="moveDown"
            icon="chevronSingleDown"
            disabled={isLast}
            onClick={run(onMoveDown)}
            data-test-subj="streamsProcessingFlyoutStepMoveDown"
          >
            {i18n.translate('xpack.streams.processingFlyout.contextMenu.moveDown', {
              defaultMessage: 'Move down',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            onClick={run(onEdit)}
            data-test-subj="streamsProcessingFlyoutStepEdit"
          >
            {i18n.translate('xpack.streams.processingFlyout.contextMenu.edit', {
              defaultMessage: 'Edit',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="duplicate"
            icon="copy"
            onClick={run(onDuplicate)}
            data-test-subj="streamsProcessingFlyoutStepDuplicate"
          >
            {i18n.translate('xpack.streams.processingFlyout.contextMenu.duplicate', {
              defaultMessage: 'Duplicate',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            onClick={run(confirmDelete)}
            data-test-subj="streamsProcessingFlyoutStepDelete"
          >
            {i18n.translate('xpack.streams.processingFlyout.contextMenu.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
