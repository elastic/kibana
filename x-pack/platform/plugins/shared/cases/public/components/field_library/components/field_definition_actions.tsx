/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import * as i18n from '../translations';

interface FieldDefinitionActionsProps {
  fieldDefinition: FieldDefinition;
  onEdit: (fieldDefinition: FieldDefinition) => void;
  onDelete: (fieldDefinition: FieldDefinition) => void;
  /** Omitted when the field is already first, or is not part of an ordered list at all. */
  onMoveUp?: () => void;
  /** Omitted when the field is already last, or is not part of an ordered list at all. */
  onMoveDown?: () => void;
  isMoveDisabled?: boolean;
}

/**
 * One menu instead of a row of icon buttons: with three-to-five actions per row the icons became
 * the widest, busiest column in the list, and rows that supported different action sets left the
 * column visibly ragged. Move up/down live here as well as on the drag handle so reordering has a
 * discoverable, pointer-free path that does not depend on a drag gesture.
 */
export const FieldDefinitionActions: React.FC<FieldDefinitionActionsProps> = ({
  fieldDefinition,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isMoveDisabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const items = useMemo(() => {
    const runAndClose = (run: () => void) => () => {
      closePopover();
      run();
    };

    return [
      ...(onMoveUp
        ? [
            <EuiContextMenuItem
              key="moveUp"
              icon="sortUp"
              disabled={isMoveDisabled}
              onClick={runAndClose(onMoveUp)}
              data-test-subj="fieldDefinitionMoveUpButton"
            >
              {i18n.MOVE_GLOBAL_FIELD_UP}
            </EuiContextMenuItem>,
          ]
        : []),
      ...(onMoveDown
        ? [
            <EuiContextMenuItem
              key="moveDown"
              icon="sortDown"
              disabled={isMoveDisabled}
              onClick={runAndClose(onMoveDown)}
              data-test-subj="fieldDefinitionMoveDownButton"
            >
              {i18n.MOVE_GLOBAL_FIELD_DOWN}
            </EuiContextMenuItem>,
          ]
        : []),
      <EuiContextMenuItem
        key="edit"
        icon="pencil"
        onClick={runAndClose(() => onEdit(fieldDefinition))}
        data-test-subj="fieldDefinitionEditButton"
      >
        {i18n.EDIT_FIELD_DEFINITION}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        onClick={runAndClose(() => onDelete(fieldDefinition))}
        data-test-subj="fieldDefinitionDeleteButton"
      >
        {i18n.DELETE_FIELD_DEFINITION}
      </EuiContextMenuItem>,
    ];
  }, [fieldDefinition, onEdit, onDelete, onMoveUp, onMoveDown, isMoveDisabled, closePopover]);

  return (
    <EuiPopover
      aria-label={i18n.FIELD_ACTIONS_MENU(fieldDefinition.name)}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
      button={
        <EuiToolTip
          content={i18n.FIELD_ACTIONS_MENU(fieldDefinition.name)}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            aria-label={i18n.FIELD_ACTIONS_MENU(fieldDefinition.name)}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`fieldDefinitionActionsButton-${fieldDefinition.name}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

FieldDefinitionActions.displayName = 'FieldDefinitionActions';
