/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { useGetCategories } from '../../../../../containers/use_get_categories';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { CategoryComponent } from '../../../../category/category_component';
import { CATEGORY } from '../../../../category/translations';
import { InlineFieldActions } from '../../../../templates_v2/field_types/controls/inline_field_actions';

export interface CategoryFieldProps {
  category?: string | null;
  onSubmit: (category: string | null) => void;
  isLoading: boolean;
}

export const CategoryField: React.FC<CategoryFieldProps> = ({ category, onSubmit, isLoading }) => {
  const { permissions } = useCasesContext();
  const { data: availableCategories = [], isLoading: isLoadingCategories } = useGetCategories();
  const [pendingCategory, setPendingCategory] = useState<string | null | undefined>(undefined);

  const isLoadingAll = isLoading || isLoadingCategories;
  const normalizedCategory = category ?? null;
  const currentValue = pendingCategory !== undefined ? pendingCategory : normalizedCategory;
  const hasPendingChange = useMemo(
    () => pendingCategory !== undefined && pendingCategory !== normalizedCategory,
    [pendingCategory, normalizedCategory]
  );

  const onChange = (value: string | null) => {
    // The combo box reports an empty selection as `undefined`; normalize it to `null` so it
    // is distinguishable from `undefined`, which we use as the "no pending change" sentinel.
    setPendingCategory(value ?? null);
  };

  const onConfirm = () => {
    if (pendingCategory !== undefined) {
      const trimmed = pendingCategory?.trim();
      onSubmit(trimmed ? trimmed : null);
    }
    setPendingCategory(undefined);
  };

  const onCancel = () => {
    setPendingCategory(undefined);
  };

  return (
    <EuiFlexItem grow={false} data-test-subj="cases-categories">
      <EuiFormRow label={CATEGORY} fullWidth>
        <CategoryComponent
          isLoading={isLoadingAll}
          isDisabled={!permissions.update}
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
