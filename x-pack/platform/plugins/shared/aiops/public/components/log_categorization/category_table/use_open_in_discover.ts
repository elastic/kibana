/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import moment from 'moment';

import { type QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import { useDiscoverLinks, createFilter } from '../use_discover_links';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import { getLabels } from './labels';

export interface OpenInDiscover {
  openFunction: (mode: QueryMode, navigateToDiscover: boolean, category?: Category) => void;
  getLabels: (navigateToDiscover: boolean) => ReturnType<typeof getLabels>;
  count: number;
}

export function useOpenInDiscover(
  dataViewId: string,
  selectedField: DataViewField | string | undefined,
  selectedCategories: Category[],
  aiopsListState: LogCategorizationAppState,
  timefilter: TimefilterContract,
  onAddFilter?: (values: Filter, alias?: string) => void,
  additionalFilter?: CategorizationAdditionalFilter,
  onClose: () => void = () => {}
): OpenInDiscover {
  const { openInDiscoverWithFilter } = useDiscoverLinks();

  const openFunction = useCallback(
    (mode: QueryMode, navigateToDiscover: boolean, category?: Category) => {
      if (
        onAddFilter !== undefined &&
        selectedField !== undefined &&
        typeof selectedField !== 'string' &&
        navigateToDiscover === false
      ) {
        onAddFilter(
          createFilter('', selectedField.name, selectedCategories, mode, category),
          `Patterns - ${selectedField.name}`
        );
        onClose();
        return;
      }

      const timefilterActiveBounds =
        additionalFilter !== undefined
          ? {
              min: moment(additionalFilter.from),
              max: moment(additionalFilter.to),
            }
          : timefilter.getActiveBounds();

      if (timefilterActiveBounds === undefined || selectedField === undefined) {
        return;
      }

      openInDiscoverWithFilter(
        dataViewId,
        typeof selectedField === 'string' ? selectedField : selectedField.name,
        selectedCategories,
        aiopsListState,
        timefilterActiveBounds,
        mode,
        category,
        additionalFilter?.field
      );
    },
    [
      onAddFilter,
      selectedField,
      additionalFilter,
      timefilter,
      openInDiscoverWithFilter,
      dataViewId,
      selectedCategories,
      aiopsListState,
      onClose,
    ]
  );

  return { openFunction, getLabels, count: selectedCategories.length };
}
