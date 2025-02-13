/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useGetCategories } from '../../containers/use_get_categories';
import { CategoryFormField } from '../category/category_form_field';
import { OptionalFieldLabel } from '../optional_field_label';

interface Props {
  isLoading: boolean;
}

const CategoryComponent: React.FC<Props> = ({ isLoading }) => {
  const { isLoading: isLoadingCategories, data: categories = [] } = useGetCategories();

  return (
    <CategoryFormField
      isLoading={isLoading || isLoadingCategories}
      availableCategories={categories}
      formRowProps={{ labelAppend: OptionalFieldLabel }}
    />
  );
};

CategoryComponent.displayName = 'CategoryComponent';

export const Category = memo(CategoryComponent);
