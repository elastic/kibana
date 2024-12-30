/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useLocation, useParams, useHistory } from 'react-router-dom';

import { useStartServices } from '../../../../../hooks';
import { useLink } from '../../../../../hooks';

import type { CategoryParams } from '..';
import { getParams } from '..';

import { pagePathGetters } from '../../../../../constants';

export interface IntegrationsURLParameters {
  searchString?: string;
  categoryId?: string;
  subCategoryId?: string;
}

export const useBuildIntegrationsUrl = () => {
  const { http } = useStartServices();
  const addBasePath = http.basePath.prepend;

  const {
    selectedCategory: initialSelectedCategory,
    selectedSubcategory: initialSubcategory,
    searchParam,
  } = getParams(useParams<CategoryParams>(), useLocation().search);

  const { getHref, getAbsolutePath } = useLink();
  const history = useHistory();

  const buildUrl = ({ searchString, categoryId, subCategoryId }: IntegrationsURLParameters) => {
    const url = pagePathGetters.integrations_all({
      category: categoryId ? categoryId : '',
      subCategory: subCategoryId ? subCategoryId : '',
      searchTerm: searchString ? searchString : '',
    })[1];
    return url;
  };

  const setUrlandPushHistory = ({
    searchString,
    categoryId,
    subCategoryId,
  }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
      subCategoryId,
    });
    history.push(url);
  };

  const setUrlandReplaceHistory = ({
    searchString,
    categoryId,
    subCategoryId,
  }: IntegrationsURLParameters) => {
    const url = buildUrl({
      categoryId,
      searchString,
      subCategoryId,
    });
    // Use .replace so the browser's back button is not tied to single keystroke
    history.replace(url);
  };

  return {
    initialSelectedCategory,
    initialSubcategory,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    getHref,
    getAbsolutePath,
    searchParam,
    addBasePath,
  };
};
