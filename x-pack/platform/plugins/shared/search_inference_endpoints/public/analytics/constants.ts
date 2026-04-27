/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EventType {
  ENDPOINT_CREATED = 'searchInferenceEndpoints_endpoint_created',
  ENDPOINT_EDITED = 'searchInferenceEndpoints_endpoint_edited',
  DEFAULT_MODEL_CHANGED = 'searchInferenceEndpoints_default_model_changed',
  FEATURE_SETTINGS_SAVED = 'searchInferenceEndpoints_feature_settings_saved',
  FILTER_APPLIED = 'searchInferenceEndpoints_filter_applied',
  GROUP_BY_CHANGED = 'searchInferenceEndpoints_group_by_changed',
  EMPTY_STATE_VIEWED = 'searchInferenceEndpoints_empty_state_viewed',
  FLYOUT_OPENED = 'searchInferenceEndpoints_flyout_opened',
  FLYOUT_CLOSED = 'searchInferenceEndpoints_flyout_closed',
  MODAL_OPENED = 'searchInferenceEndpoints_modal_opened',
  MODAL_CLOSED = 'searchInferenceEndpoints_modal_closed',
  EIS_MODEL_VIEWED = 'searchInferenceEndpoints_eis_model_viewed',
  COPY_TO_FEATURE_TOGGLED = 'searchInferenceEndpoints_copy_to_feature_toggled',
}
