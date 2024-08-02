/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTableActionsColumnType } from '@elastic/eui';
import { useCallback } from 'react';
import * as i18n from './translations';

interface Props<T> {
  disabled?: boolean;
  onDelete?: (rowItem: T) => void;
  onEdit?: (rowItem: T) => void;
}

export const useInlineActions = <T extends { isDefault?: boolean | undefined }>() => {
  const getInlineActions = useCallback(({ disabled = false, onDelete, onEdit }: Props<T>) => {
    const handleEdit = (rowItem: T) => {
      onEdit?.(rowItem);
    };

    const handleDelete = (rowItem: T) => {
      onDelete?.(rowItem);
    };

    const actions: EuiTableActionsColumnType<T> = {
      name: i18n.ACTIONS_BUTTON,
      actions: [
        {
          name: i18n.EDIT_BUTTON,
          description: i18n.EDIT_BUTTON,
          icon: 'pencil',
          type: 'icon',
          onClick: (rowItem: T) => {
            handleEdit(rowItem);
          },
          enabled: () => !disabled,
          available: () => onEdit != null,
        },
        {
          name: i18n.DELETE_BUTTON,
          description: i18n.DELETE_BUTTON,
          icon: 'trash',
          type: 'icon',
          onClick: (rowItem: T) => {
            handleDelete(rowItem);
          },
          enabled: ({ isDefault }: { isDefault?: boolean }) => !isDefault && !disabled,
          available: () => onDelete != null,
          color: 'danger',
        },
      ],
    };
    return actions;
  }, []);

  return getInlineActions;
};
