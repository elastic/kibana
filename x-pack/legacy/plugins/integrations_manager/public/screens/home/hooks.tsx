/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';
import { CategorySummaryList, IntegrationList } from '../../../common/types';
import { getCategories, getIntegrations } from '../../data';
import { LocalSearch, fieldsToSearch, searchIdField } from './search_integrations';

export function useCategories() {
  const [categories, setCategories] = useState<CategorySummaryList>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return [categories, setCategories] as [typeof categories, typeof setCategories];
}

export function useCategoryIntegrations(selectedCategory: string) {
  const [categoryIntegrations, setCategoryIntegrations] = useState<IntegrationList>([]);

  useEffect(() => {
    getIntegrations({ category: selectedCategory }).then(setCategoryIntegrations);
  }, [selectedCategory]);

  return [categoryIntegrations, setCategoryIntegrations] as [
    typeof categoryIntegrations,
    typeof setCategoryIntegrations
  ];
}

export function useAllIntegrations(
  selectedCategory: string,
  categoryIntegrations: IntegrationList
) {
  const [allIntegrations, setAllIntegrations] = useState<IntegrationList>([]);

  useEffect(() => {
    if (!selectedCategory) setAllIntegrations(categoryIntegrations);
  }, [selectedCategory, categoryIntegrations]);

  return [allIntegrations, setAllIntegrations] as [
    typeof allIntegrations,
    typeof setAllIntegrations
  ];
}

export function useLocalSearch(allIntegrations: IntegrationList) {
  const localSearchRef = useRef<LocalSearch | null>(null);

  useEffect(() => {
    if (!allIntegrations.length) return;

    const localSearch = new LocalSearch(searchIdField);
    fieldsToSearch.forEach(field => localSearch.addIndex(field));
    localSearch.addDocuments(allIntegrations);
    localSearchRef.current = localSearch;
  }, [allIntegrations]);

  return localSearchRef;
}

export function useInstalledIntegrations(allIntegrations: IntegrationList) {
  const [installedIntegrations, setInstalledIntegrations] = useState<IntegrationList>([]);

  useEffect(() => {
    setInstalledIntegrations(allIntegrations.filter(({ status }) => status === 'installed'));
  }, [allIntegrations]);

  return [installedIntegrations, setInstalledIntegrations] as [
    typeof installedIntegrations,
    typeof setInstalledIntegrations
  ];
}
