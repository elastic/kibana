/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains values for ML anomaly explorer.
 */

import { i18n } from '@kbn/i18n';

export const DRAG_SELECT_ACTION = {
  NEW_SELECTION: 'newSelection',
  ELEMENT_SELECT: 'elementSelect',
  DRAG_START: 'dragStart',
};

export const EXPLORER_ACTION = {
  IDLE: 'idle',
  INITIALIZE: 'initialize',
  JOB_SELECTION_CHANGE: 'jobSelectionChange',
  LOAD_JOBS: 'loadJobs',
  REDRAW: 'redraw',
  RELOAD: 'reload',
};

export const FILTER_ACTION = {
  ADD: '+',
  REMOVE: '-',
};

export const APP_STATE_ACTION = {
  CLEAR_INFLUENCER_FILTER_SETTINGS: 'clearInfluencerFilterSettings',
  CLEAR_SELECTION: 'clearSelection',
  SAVE_SELECTION: 'saveSelection',
  SAVE_SWIMLANE_VIEW_BY_FIELD_NAME: 'saveSwimlaneViewByFieldName',
  SAVE_INFLUENCER_FILTER_SETTINGS: 'saveInfluencerFilterSettings',
};

export const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
};

export const CHART_TYPE = {
  EVENT_DISTRIBUTION: 'event_distribution',
  POPULATION_DISTRIBUTION: 'population_distribution',
  SINGLE_METRIC: 'single_metric',
};

export const MAX_CATEGORY_EXAMPLES = 10;
export const MAX_INFLUENCER_FIELD_VALUES = 10;
export const MAX_INFLUENCER_FIELD_NAMES = 50;

export const VIEW_BY_JOB_LABEL = i18n.translate('xpack.ml.explorer.jobIdLabel', {
  defaultMessage: 'job ID',
});
