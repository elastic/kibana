/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { TIME_SERIES_METRIC_TYPES } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { SavedSearchQuery } from '@kbn/ml-query-utils';

import type { LatestFunctionConfig } from '../../../../../../../server/routes/api_schemas/transforms';
import type { EsFieldName } from '../../../../../../../common/types/fields';

import type {
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotGroupByConfigWithUiSupportDict,
} from '../../../../../common';

import type { TransformFunction } from '../../../../../../../common/constants';
import type {
  LatestFunctionConfigUI,
  PivotConfigDefinition,
} from '../../../../../../../common/types/transform';

import type { QUERY_LANGUAGE } from './constants';

export interface Field {
  name: EsFieldName;
  type: KBN_FIELD_TYPES | TIME_SERIES_METRIC_TYPES.COUNTER;
}

export interface StepDefineExposedState {
  transformFunction: TransformFunction;
  aggList: PivotAggsConfigDict;
  groupByList: PivotGroupByConfigDict | PivotGroupByConfigWithUiSupportDict;
  latestConfig: LatestFunctionConfigUI;
  isAdvancedPivotEditorEnabled: boolean;
  isAdvancedSourceEditorEnabled: boolean;
  searchLanguage: QUERY_LANGUAGE;
  searchString: string | undefined;
  searchQuery: string | SavedSearchQuery;
  sourceConfigUpdated: boolean;
  valid: boolean;
  validationStatus: { isValid: boolean; errorMessage?: string };
  runtimeMappings?: RuntimeMappings;
  runtimeMappingsUpdated: boolean;
  isRuntimeMappingsEditorEnabled: boolean;
  timeRangeMs?: TimeRangeMs;
  isDatePickerApplyEnabled: boolean;
  /**
   * Undefined when the form is incomplete or invalid
   */
  previewRequest: { latest: LatestFunctionConfig } | { pivot: PivotConfigDefinition } | undefined;
}

export function isPivotPartialRequest(arg: unknown): arg is { pivot: PivotConfigDefinition } {
  return isPopulatedObject(arg, ['pivot']);
}

export function isLatestPartialRequest(arg: unknown): arg is { latest: LatestFunctionConfig } {
  return isPopulatedObject(arg, ['latest']);
}
