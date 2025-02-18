/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { FieldItemButtonProps, FieldListItem } from '@kbn/unified-field-list';
import { i18n } from '@kbn/i18n';
import { type DataViewField } from '@kbn/data-views-plugin/common';

interface GetFieldItemActionsParams<T extends FieldListItem> {
  value: DragDropIdentifier;
  dropOntoWorkspace: (value: DragDropIdentifier) => void;
  hasSuggestionForField: (value: DragDropIdentifier) => boolean;
  closeFieldPopover?: () => void;
}

interface GetFieldItemActionsResult<T extends FieldListItem> {
  buttonAddFieldToWorkspaceProps: FieldItemButtonProps<T>['buttonAddFieldToWorkspaceProps'];
  onAddFieldToWorkspace: FieldItemButtonProps<T | DataViewField>['onAddFieldToWorkspace'];
}

export function getFieldItemActions<T extends FieldListItem>({
  value,
  hasSuggestionForField,
  dropOntoWorkspace,
  closeFieldPopover,
}: GetFieldItemActionsParams<T>): GetFieldItemActionsResult<T> {
  const canAddToWorkspace = hasSuggestionForField(value);
  const addToWorkplaceButtonTitle = canAddToWorkspace
    ? i18n.translate('xpack.lens.indexPattern.moveToWorkspace', {
        defaultMessage: 'Add {field} to workspace',
        values: {
          field: value.humanData.label,
        },
      })
    : i18n.translate('xpack.lens.indexPattern.moveToWorkspaceNotAvailable', {
        defaultMessage:
          'To visualize this field, please add it directly to the desired layer. Adding this field to the workspace is not supported based on your current configuration.',
      });

  const dropOntoWorkspaceAndClose = () => {
    closeFieldPopover?.();
    dropOntoWorkspace(value);
  };

  return {
    buttonAddFieldToWorkspaceProps: {
      isDisabled: !canAddToWorkspace,
      'aria-label': addToWorkplaceButtonTitle,
    },
    onAddFieldToWorkspace: dropOntoWorkspaceAndClose,
  };
}
