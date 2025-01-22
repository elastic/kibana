/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';

/* @internal */
export enum CountMetric {
  UNHANDLED_ERROR = 'unhandled_error',
  SHORTCUT_USED = 'shortcut_used',
  SEARCH_FOCUS = 'search_focus',
  SEARCH_REQUEST = 'search_request',
}

/* @internal */
export enum ClickMetric {
  USER_NAVIGATED_TO_APPLICATION = 'user_navigated_to_application',
  USER_NAVIGATED_TO_SAVED_OBJECT = 'user_navigated_to_saved_object',
}

/* @internal */
export enum EventMetric {
  CLICK_APPLICATION = 'global_search_bar_click_application',
  CLICK_SAVED_OBJECT = 'global_search_bar_click_saved_object',
  SEARCH_BLUR = 'global_search_bar_blur',
  ERROR = 'global_search_bar_error',
}

/* @internal */
export enum FieldType {
  APPLICATION = 'application',
  SAVED_OBJECT_TYPE = 'saved_object_type',
  FOCUS_TIME = 'focus_time_ms',
  SELECTED_LABEL = 'selected_label',
  SELECTED_RANK = 'selected_rank',
  ERROR_MESSAGE = 'error_message',
  TERMS = 'terms',
}

/* @internal */
export type TrackUiMetricFn = (
  metricType: UiCounterMetricType,
  eventName: CountMetric | ClickMetric,
  context?: string
) => void;

/* @internal */
export interface TrackedApplicationClick {
  application: string;
  searchValue: string;
  selectedLabel: string | null;
  selectedRank: number | null;
}
/* @internal */
export interface TrackedSavedObjectClick {
  type: string;
  searchValue: string;
  selectedLabel: string | null;
  selectedRank: number | null;
}
/* @internal */
export interface TrackedError {
  message: string | Error;
  searchValue?: string;
}

export interface GlobalSearchBarConfigType {
  input_max_limit: number;
}
