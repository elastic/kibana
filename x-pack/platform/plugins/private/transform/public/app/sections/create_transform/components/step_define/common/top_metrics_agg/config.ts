/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import {
  isPivotAggsConfigWithUiBase,
  isSpecialSortField,
  isValidSortDirection,
  isValidSortMode,
  isValidSortNumericType,
} from '../../../../../../common/pivot_aggs';
import type { PivotAggsConfigTopMetrics } from './types';
import { TopMetricsAggForm } from './components/top_metrics_agg_form';

/**
 * Gets initial basic configuration of the top_metrics aggregation.
 */
export function getTopMetricsAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): PivotAggsConfigTopMetrics {
  return {
    ...commonConfig,
    isSubAggsSupported: false,
    isMultiField: true,
    field: isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : '',
    AggFormComponent: TopMetricsAggForm,
    aggConfig: {},
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
        return null;
      }

      const { sortField, sortSettings = {}, ...unsupportedConfig } = this.aggConfig;

      let sort = null;

      if (isSpecialSortField(sortField)) {
        sort = sortField;
      } else {
        const { mode, numericType, order, ...rest } = sortSettings;

        if (mode || numericType || isPopulatedObject(rest)) {
          sort = {
            [sortField!]: {
              ...rest,
              order,
              ...(mode ? { mode } : {}),
              ...(numericType ? { numeric_type: numericType } : {}),
            },
          };
        } else {
          sort = { [sortField!]: sortSettings.order as estypes.SortOrder };
        }
      }

      return {
        metrics: (Array.isArray(this.field) ? this.field : [this.field]).map((f) => ({
          field: f as string,
        })),
        sort: sort!,
        ...(unsupportedConfig ?? {}),
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const { metrics, sort, ...unsupportedConfig } = esAggDefinition;

      this.field = (Array.isArray(metrics) ? metrics : [metrics]).map((v) => v!.field);

      if (isSpecialSortField(sort)) {
        this.aggConfig.sortField = sort;
        return;
      }

      if (!sort) {
        this.aggConfig = {
          ...this.aggConfig,
          ...(unsupportedConfig ?? {}),
        };

        return;
      }

      const sortField = Object.keys(sort)[0];

      this.aggConfig.sortField = sortField;

      const sortDefinition = sort[sortField];

      this.aggConfig.sortSettings = this.aggConfig.sortSettings ?? {};

      if (isValidSortDirection(sortDefinition)) {
        this.aggConfig.sortSettings.order = sortDefinition;
      }

      if (isPopulatedObject(sortDefinition)) {
        const { order, mode, numeric_type: numType, ...rest } = sortDefinition;
        this.aggConfig.sortSettings = rest;

        if (isValidSortDirection(order)) {
          this.aggConfig.sortSettings.order = order;
        }
        if (isValidSortMode(mode)) {
          this.aggConfig.sortSettings.mode = mode;
        }
        if (isValidSortNumericType(numType)) {
          this.aggConfig.sortSettings.numericType = numType;
        }
      }

      this.aggConfig = {
        ...this.aggConfig,
        ...(unsupportedConfig ?? {}),
      };
    },
    isValid() {
      return (
        !!this.aggConfig.sortField &&
        (isSpecialSortField(this.aggConfig.sortField) ? true : !!this.aggConfig.sortSettings?.order)
      );
    },
  };
}
