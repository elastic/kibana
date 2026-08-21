/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import type { FieldEditDisplay } from '../../config_context';
import { useConfig } from '../../config_context';
import { useDispatch, useMappingsState } from '../../mappings_state_context';
import type { DocumentFieldsStatus } from '../../types';

export const getAreFieldActionButtonsVisible = ({
  fieldEditDisplay = 'flyout',
  status,
  fieldToEdit,
  fieldId,
}: {
  fieldEditDisplay?: FieldEditDisplay;
  status: DocumentFieldsStatus;
  fieldToEdit?: string;
  fieldId: string;
}): boolean => {
  if (status === 'idle') {
    return true;
  }

  if (fieldEditDisplay === 'inline') {
    if (status === 'creatingField') {
      return true;
    }

    if (status === 'editingField') {
      return fieldToEdit !== fieldId;
    }
  }

  return false;
};

export const getIsFieldDimmed = ({
  fieldEditDisplay = 'flyout',
  status,
  fieldToEdit,
  fieldId,
}: {
  fieldEditDisplay?: FieldEditDisplay;
  status: DocumentFieldsStatus;
  fieldToEdit?: string;
  fieldId: string;
}): boolean => {
  if (fieldEditDisplay === 'inline') {
    return false;
  }

  return status === 'editingField' && fieldToEdit !== fieldId;
};

export const useInlineFieldEdit = () => {
  const dispatch = useDispatch();
  const {
    value: { fieldEditDisplay = 'flyout' },
  } = useConfig();
  const {
    documentFields: { status },
  } = useMappingsState();

  const isInlineFieldEditEnabled = fieldEditDisplay === 'inline';
  const isInlineFieldEditOpen = isInlineFieldEditEnabled && status === 'editingField';
  const isInlineFieldFormOpen = isInlineFieldEditEnabled && status !== 'idle';

  const cancelInlineFieldEdit = useCallback(() => {
    if (isInlineFieldFormOpen) {
      dispatch({ type: 'documentField.changeStatus', value: 'idle' });
    }
  }, [dispatch, isInlineFieldFormOpen]);

  return {
    fieldEditDisplay,
    isInlineFieldEditEnabled,
    isInlineFieldEditOpen,
    cancelInlineFieldEdit,
  };
};
