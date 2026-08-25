/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CaseStatuses } from '../../../../common/types/domain';
import { MAX_TAGS_FILTER_LENGTH, MAX_CATEGORY_FILTER_LENGTH } from '../../../../common/constants';
import { MultiSelectFilter, mapToMultiSelectOption } from '../multi_select_filter';
import { SolutionFilter } from '../solution_filter';
import { StatusFilter } from '../status_filter';
import * as i18n from '../translations';
import { SeverityFilter } from '../severity_filter';
import { AssigneesFilterPopover } from '../assignees_filter';
import type { CurrentUserProfile } from '../../types';
import type { FilterChangeHandler, FilterConfig, FilterConfigRenderParams } from './types';

interface UseFilterConfigProps {
  availableSolutions: string[];
  caseAssignmentAuthorized: boolean;
  categories: string[];
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  currentUserProfile: CurrentUserProfile;
  hiddenStatuses?: CaseStatuses[];
  isLoading: boolean;
  isSelectorView?: boolean;
  onFilterOptionsChange: FilterChangeHandler;
  tags: string[];
}

export const getSystemFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  categories,
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  currentUserProfile,
  hiddenStatuses,
  isLoading,
  isSelectorView,
  onFilterOptionsChange,
  tags,
}: UseFilterConfigProps): FilterConfig[] => {
  const onSystemFilterChange = ({
    filterId,
    selectedOptionKeys,
  }: {
    filterId: string;
    selectedOptionKeys: Array<string | null>;
  }) => {
    onFilterOptionsChange({
      [filterId]: selectedOptionKeys,
    });
  };
  return [
    {
      key: 'severity',
      label: i18n.SEVERITY,
      isActive: true,
      isAvailable: true,
      getEmptyOptions: () => {
        return {
          severity: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => (
        <SeverityFilter
          selectedOptionKeys={filterOptions.severity}
          onChange={onSystemFilterChange}
        />
      ),
    },
    {
      key: 'status',
      label: i18n.STATUS,
      isActive: true,
      isAvailable: true,
      getEmptyOptions: () => {
        return {
          status: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => (
        <StatusFilter
          selectedOptionKeys={filterOptions?.status}
          onChange={onSystemFilterChange}
          hiddenStatuses={hiddenStatuses}
          countClosedCases={countClosedCases}
          countInProgressCases={countInProgressCases}
          countOpenCases={countOpenCases}
        />
      ),
    },
    {
      key: 'assignees',
      label: i18n.ASSIGNEES,
      isActive: true,
      isAvailable: caseAssignmentAuthorized && !isSelectorView,
      getEmptyOptions: () => {
        return {
          assignees: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => {
        return (
          <AssigneesFilterPopover
            selectedAssignees={filterOptions?.assignees}
            currentUserProfile={currentUserProfile}
            isLoading={isLoading}
            onSelectionChange={onSystemFilterChange}
          />
        );
      },
    },
    {
      key: 'tags',
      label: i18n.TAGS,
      isActive: true,
      isAvailable: true,
      getEmptyOptions: () => {
        return {
          tags: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => (
        <MultiSelectFilter
          buttonLabel={i18n.TAGS}
          id={'tags'}
          limit={MAX_TAGS_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_TAGS_FILTER_LENGTH, 'tags')}
          onChange={onSystemFilterChange}
          options={mapToMultiSelectOption(tags)}
          selectedOptionKeys={filterOptions?.tags}
          isLoading={isLoading}
        />
      ),
    },
    {
      key: 'category',
      label: i18n.CATEGORIES,
      isActive: true,
      isAvailable: true,
      getEmptyOptions: () => {
        return {
          category: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => (
        <MultiSelectFilter
          buttonLabel={i18n.CATEGORIES}
          id={'category'}
          limit={MAX_CATEGORY_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_CATEGORY_FILTER_LENGTH, 'categories')}
          onChange={onSystemFilterChange}
          options={mapToMultiSelectOption(categories)}
          selectedOptionKeys={filterOptions?.category}
          isLoading={isLoading}
        />
      ),
    },
    {
      key: 'owner',
      label: i18n.SOLUTION,
      isActive: true,
      isAvailable: availableSolutions.length > 1,
      getEmptyOptions: () => {
        return {
          owner: [],
        };
      },
      render: ({ filterOptions }: FilterConfigRenderParams) => (
        <SolutionFilter
          onChange={onSystemFilterChange}
          selectedOptionKeys={filterOptions?.owner}
          availableSolutions={availableSolutions}
        />
      ),
    },
  ];
};

export const useSystemFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  categories,
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  currentUserProfile,
  hiddenStatuses,
  isLoading,
  isSelectorView,
  onFilterOptionsChange,
  tags,
}: UseFilterConfigProps) => {
  const filterConfig = getSystemFilterConfig({
    availableSolutions,
    caseAssignmentAuthorized,
    categories,
    countClosedCases,
    countInProgressCases,
    countOpenCases,
    currentUserProfile,
    hiddenStatuses,
    isLoading,
    isSelectorView,
    onFilterOptionsChange,
    tags,
  });

  return {
    systemFilterConfig: filterConfig,
  };
};
