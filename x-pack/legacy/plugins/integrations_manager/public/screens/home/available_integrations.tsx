/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFacetButton, EuiFacetGroup } from '@elastic/eui';
import { CategorySummaryItem, CategorySummaryList, IntegrationList } from '../../../common/types';
import { IntegrationListGrid } from '../../components/integration_list_grid';
import { getCategories } from '../../data';

interface AvailableIntegrationsProps {
  list: IntegrationList;
  onCategoryChange: (item: CategorySummaryItem) => any;
}

export function AvailableIntegrations({ list, onCategoryChange }: AvailableIntegrationsProps) {
  const [categories, setCategories] = useState<CategorySummaryList>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const noFilter: CategorySummaryItem = {
    id: '',
    title: 'All',
    count: list.length,
  };

  const availableTitle = 'Available Integrations';
  const controls = (
    <EuiFacetGroup>
      {[noFilter, ...categories].map(category => (
        <EuiFacetButton
          isSelected={category.id === selectedCategory}
          key={category.id}
          id={category.id}
          quantity={category.count}
          onClick={() => {
            onCategoryChange(category);
            setSelectedCategory(category.id);
          }}
        >
          {category.title}
        </EuiFacetButton>
      ))}
    </EuiFacetGroup>
  );

  return <IntegrationListGrid title={availableTitle} controls={controls} list={list} />;
}
