/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EventType {
  ENDPOINT_CREATED = 'endpoint_created',
  ENDPOINT_EDITED = 'endpoint_edited',
  DEFAULT_MODEL_CHANGED = 'default_model_changed',
  FEATURE_SETTINGS_SAVED = 'feature_settings_saved',
  FILTER_APPLIED = 'filter_applied',
  GROUP_BY_CHANGED = 'group_by_changed',
  EMPTY_STATE_VIEWED = 'empty_state_viewed',
  FLYOUT_OPENED = 'flyout_opened',
  FLYOUT_CLOSED = 'flyout_closed',
  MODAL_OPENED = 'modal_opened',
  MODAL_CLOSED = 'modal_closed',
  EIS_MODEL_VIEWED = 'eis_model_viewed',
  COPY_TO_FEATURE_TOGGLED = 'copy_to_feature_toggled',
}
