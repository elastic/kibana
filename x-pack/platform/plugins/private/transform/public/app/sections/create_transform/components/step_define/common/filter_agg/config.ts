/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJsonString } from '../../../../../../common/validators';
import type {
  PivotAggsConfigBase,
  PivotAggsConfigWithUiBase,
} from '../../../../../../common/pivot_aggs';
import { isPivotAggsConfigWithUiBase } from '../../../../../../common/pivot_aggs';
import { FILTERS } from './constants';
import { FilterAggForm, FilterEditorForm, FilterRangeForm, FilterTermForm } from './components';
import type {
  FilterAggConfigBool,
  FilterAggConfigExists,
  FilterAggConfigRange,
  FilterAggConfigTerm,
  FilterAggConfigUnion,
  FilterAggType,
  PivotAggsConfigFilter,
} from './types';

/**
 * Gets initial basic configuration of the filter aggregation.
 */
export function getFilterAggConfig(
  commonConfig: PivotAggsConfigWithUiBase | PivotAggsConfigBase
): PivotAggsConfigFilter {
  const field = isPivotAggsConfigWithUiBase(commonConfig) ? commonConfig.field : null;

  return {
    ...commonConfig,
    isSubAggsSupported: true,
    // Field name might be missing, for instance for the bool filter.
    field,
    AggFormComponent: FilterAggForm,
    aggConfig: {},
    getEsAggConfig() {
      // ensure the configuration has been completed
      if (!this.isValid()) {
        return null;
      }
      const esAgg = this.aggConfig.aggTypeConfig?.getEsAggConfig(this.field);
      return {
        [this.aggConfig.filterAgg as string]: esAgg,
      };
    },
    setUiConfigFromEs(esAggDefinition) {
      const filterAgg = Object.keys(esAggDefinition)[0] as FilterAggType;
      // @ts-ignore conflicts with a union type
      const filterAggConfig = esAggDefinition[filterAgg];

      const aggTypeConfig = getFilterAggTypeConfig(filterAgg, field as string, filterAggConfig);

      this.field = field ?? aggTypeConfig.fieldName ?? null;

      this.aggConfig = {
        filterAgg,
        aggTypeConfig,
      };
    },
    isValid() {
      return (
        this.aggConfig?.filterAgg !== undefined &&
        (this.aggConfig.aggTypeConfig?.isValid ? this.aggConfig.aggTypeConfig.isValid() : true)
      );
    },
    getAggName() {
      return this.aggConfig?.aggTypeConfig?.getAggName
        ? this.aggConfig.aggTypeConfig.getAggName()
        : undefined;
    },
    helperText() {
      return this.aggConfig?.aggTypeConfig?.helperText
        ? this.aggConfig.aggTypeConfig.helperText()
        : undefined;
    },
  };
}

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType: FilterAggConfigUnion['filterAgg'] | FilterAggType,
  fieldName?: string,
  esConfig?: { [key: string]: any }
): FilterAggConfigUnion['aggTypeConfig'] {
  let resultField = fieldName;

  switch (filterAggType) {
    case FILTERS.TERM:
      const value = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

      resultField = esConfig ? Object.keys(esConfig)[0] : resultField;

      return {
        FilterAggFormComponent: FilterTermForm,
        filterAggConfig: {
          value,
        },
        getEsAggConfig() {
          if (this.fieldName === undefined || !this.filterAggConfig) {
            throw new Error(`Config ${FILTERS.TERM} is not completed`);
          }
          return {
            [this.fieldName]: this.filterAggConfig.value,
          };
        },
        isValid() {
          return this.filterAggConfig?.value !== undefined;
        },
        getAggName() {
          return this.filterAggConfig?.value ? this.filterAggConfig.value : undefined;
        },
        fieldName: resultField,
      } as FilterAggConfigTerm['aggTypeConfig'];
    case FILTERS.RANGE:
      resultField = esConfig ? Object.keys(esConfig)[0] : resultField;

      const esFilterRange = typeof esConfig === 'object' ? Object.values(esConfig)[0] : undefined;

      return {
        fieldName: resultField,
        FilterAggFormComponent: FilterRangeForm,
        filterAggConfig:
          typeof esFilterRange === 'object'
            ? {
                from: esFilterRange.gte ?? esFilterRange.gt,
                to: esFilterRange.lte ?? esFilterRange.lt,
                includeFrom: esFilterRange.gte !== undefined,
                includeTo: esFilterRange.lte !== undefined,
              }
            : undefined,
        getEsAggConfig() {
          if (this.fieldName === undefined || !this.filterAggConfig) {
            throw new Error(`Config ${FILTERS.RANGE} is not completed`);
          }

          const { from, includeFrom, to, includeTo } = this.filterAggConfig;
          const result = {} as ReturnType<
            FilterAggConfigRange['aggTypeConfig']['getEsAggConfig']
          >[0];

          if (from) {
            result[includeFrom ? 'gte' : 'gt'] = from;
          }
          if (to) {
            result[includeTo ? 'lte' : 'lt'] = to;
          }

          return {
            [this.fieldName]: result,
          };
        },
        isValid() {
          if (
            typeof this.filterAggConfig !== 'object' ||
            (this.filterAggConfig.from === undefined && this.filterAggConfig.to === undefined)
          ) {
            return false;
          }

          if (this.filterAggConfig.from !== undefined && this.filterAggConfig.to !== undefined) {
            return this.filterAggConfig.from <= this.filterAggConfig.to;
          }

          return true;
        },
        helperText() {
          if (!this.isValid!()) return;
          const { from, to, includeFrom, includeTo } = this.filterAggConfig!;

          return `range: ${`${from !== undefined ? `${includeFrom ? '≥' : '>'} ${from}` : ''} ${
            from !== undefined && to !== undefined ? '&' : ''
          } ${to !== undefined ? `${includeTo ? '≤' : '<'} ${to}` : ''}`.trim()}`;
        },
      } as FilterAggConfigRange['aggTypeConfig'];
    case FILTERS.EXISTS:
      resultField = esConfig ? esConfig.field : resultField;

      return {
        fieldName: resultField,
        getEsAggConfig() {
          if (this.fieldName === undefined) {
            throw new Error(`Config ${FILTERS.EXISTS} is not completed`);
          }
          return {
            field: this.fieldName,
          };
        },
        isValid() {
          return typeof this.fieldName === 'string';
        },
      } as FilterAggConfigExists['aggTypeConfig'];
    case FILTERS.BOOL:
      return {
        FilterAggFormComponent: FilterEditorForm,
        filterAggConfig: JSON.stringify(
          {
            must: [],
            must_not: [],
            should: [],
          },
          null,
          2
        ),
        isValid() {
          return isJsonString(this.filterAggConfig);
        },
        getEsAggConfig() {
          return JSON.parse(this.filterAggConfig!);
        },
      } as FilterAggConfigBool['aggTypeConfig'];
    default:
      return {
        fieldName,
        FilterAggFormComponent: FilterEditorForm,
        filterAggConfig: '',
        getEsAggConfig() {
          return this.filterAggConfig !== undefined ? JSON.parse(this.filterAggConfig!) : {};
        },
        isValid() {
          return isJsonString(this.filterAggConfig);
        },
      };
  }
}
