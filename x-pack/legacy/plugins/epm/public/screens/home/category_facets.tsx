/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFacetButton, EuiFacetGroup } from '@elastic/eui';
import { CategorySummaryItem, CategorySummaryList } from '../../../common/types';

export function CategoryFacets({
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  categories: CategorySummaryList;
  selectedCategory: string;
  onCategoryChange: (category: CategorySummaryItem) => unknown;
}) {
  const controls = (
    <EuiFacetGroup>
      {categories.map(category => (
        <EuiFacetButton
          isSelected={category.id === selectedCategory}
          key={category.id}
          id={category.id}
          quantity={category.count}
          onClick={() => onCategoryChange(category)}
        >
          {category.title}
        </EuiFacetButton>
      ))}
    </EuiFacetGroup>
  );

  return controls;
}
