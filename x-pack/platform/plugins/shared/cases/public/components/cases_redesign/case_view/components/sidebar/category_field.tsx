/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { MAX_CATEGORY_LENGTH } from '../../../../../../common/constants';
import { useGetCategories } from '../../../../../containers/use_get_categories';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { CategoryComponent } from '../../../../category/category_component';
import {
  CATEGORY,
  EMPTY_CATEGORY_VALIDATION_MSG,
  MAX_LENGTH_ERROR,
} from '../../../../category/translations';
import { InlineFieldActions } from '../../../../templates_v2/field_types/controls/inline_field_actions';
import { usePendingFieldValue } from './hooks/use_pending_field_value';

export interface CategoryFieldProps {
  category?: string | null;
  onSubmit: (category: string | null) => void;
  isLoading: boolean;
}

const validate = (value: string | null): string | null => {
  if (value == null) {
    return null;
  }
  if (isEmpty(value.trim())) {
    return EMPTY_CATEGORY_VALIDATION_MSG;
  }
  if (value.length > MAX_CATEGORY_LENGTH) {
    return MAX_LENGTH_ERROR('category', MAX_CATEGORY_LENGTH);
  }
  return null;
};

export const CategoryField: React.FC<CategoryFieldProps> = ({ category, onSubmit, isLoading }) => {
  const { permissions } = useCasesContext();
  const { data: availableCategories = [], isLoading: isLoadingCategories } = useGetCategories();
  const isLoadingAll = isLoading || isLoadingCategories;

  const onSubmitTrimmed = useCallback(
    (value: string | null) => onSubmit(value === null ? null : value.trim()),
    [onSubmit]
  );

  const { currentValue, hasPendingChange, validationError, setPendingValue, onConfirm, onCancel } =
    usePendingFieldValue<string | null>({
      committedValue: category ?? null,
      onSubmit: onSubmitTrimmed,
      validate,
    });

  const onChange = (value: string | null) => {
    // The combo box reports an empty selection as `undefined`; normalize it to `null`, a valid
    // committed value, so it isn't confused with "no pending change".
    setPendingValue(value ?? null);
  };

  return (
    <EuiFlexItem grow={false} data-test-subj="cases-categories">
      <EuiFormRow
        label={CATEGORY}
        error={validationError}
        isInvalid={validationError != null}
        fullWidth
      >
        <CategoryComponent
          isLoading={isLoadingAll}
          isDisabled={!permissions.update}
          isInvalid={validationError != null}
          onChange={onChange}
          category={currentValue}
          availableCategories={availableCategories}
        />
      </EuiFormRow>
      {hasPendingChange && !isLoadingAll && (
        <InlineFieldActions name="category" onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </EuiFlexItem>
  );
};
CategoryField.displayName = 'CategoryField';
