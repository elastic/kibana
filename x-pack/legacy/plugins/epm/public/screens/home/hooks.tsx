/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';
import { CategorySummaryList } from '../../../common/types';
import { PackageList } from '../../../server/types';
import { getCategories, getPackages } from '../../data';
import { LocalSearch, fieldsToSearch, searchIdField } from './search_packages';

export function useCategories() {
  const [categories, setCategories] = useState<CategorySummaryList>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return [categories, setCategories] as [typeof categories, typeof setCategories];
}

export function useCategoryPackages(selectedCategory: string) {
  const [categoryPackages, setCategoryPackages] = useState<PackageList>([]);

  useEffect(() => {
    getPackages({ category: selectedCategory }).then(setCategoryPackages);
  }, [selectedCategory]);

  return [categoryPackages, setCategoryPackages] as [
    typeof categoryPackages,
    typeof setCategoryPackages
  ];
}

export function useAllPackages(selectedCategory: string, categoryPackages: PackageList) {
  const [allPackages, setAllPackages] = useState<PackageList>([]);

  useEffect(() => {
    if (!selectedCategory) setAllPackages(categoryPackages);
  }, [selectedCategory, categoryPackages]);

  return [allPackages, setAllPackages] as [typeof allPackages, typeof setAllPackages];
}

export function useLocalSearch(allPackages: PackageList) {
  const localSearchRef = useRef<LocalSearch | null>(null);

  useEffect(() => {
    if (!allPackages.length) return;

    const localSearch = new LocalSearch(searchIdField);
    fieldsToSearch.forEach(field => localSearch.addIndex(field));
    localSearch.addDocuments(allPackages);
    localSearchRef.current = localSearch;
  }, [allPackages]);

  return localSearchRef;
}

export function useInstalledPackages(allPackages: PackageList) {
  const [installedPackages, setInstalledPackages] = useState<PackageList>([]);

  useEffect(() => {
    setInstalledPackages(allPackages.filter(({ status }) => status === 'installed'));
  }, [allPackages]);

  return [installedPackages, setInstalledPackages] as [
    typeof installedPackages,
    typeof setInstalledPackages
  ];
}
