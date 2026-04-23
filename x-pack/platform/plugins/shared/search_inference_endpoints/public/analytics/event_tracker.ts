/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';

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
}

export class EventTracker {
  constructor(private readonly analytics: Pick<AnalyticsServiceStart, 'reportEvent'>) {}

  private track(eventType: EventType, data: Record<string, unknown> = {}) {
    try {
      this.analytics.reportEvent(eventType, data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  endpointCreated() {
    this.track(EventType.ENDPOINT_CREATED);
  }
  endpointEdited() {
    this.track(EventType.ENDPOINT_EDITED);
  }
  defaultModelChanged() {
    this.track(EventType.DEFAULT_MODEL_CHANGED);
  }
  featureSettingsSaved() {
    this.track(EventType.FEATURE_SETTINGS_SAVED);
  }
  filterApplied(filter: string) {
    this.track(EventType.FILTER_APPLIED, { filter });
  }
  groupByChanged(groupBy: string) {
    this.track(EventType.GROUP_BY_CHANGED, { group_by: groupBy });
  }
  emptyStateViewed() {
    this.track(EventType.EMPTY_STATE_VIEWED);
  }
  flyoutOpened(flyout: string) {
    this.track(EventType.FLYOUT_OPENED, { flyout });
  }
  flyoutClosed(flyout: string) {
    this.track(EventType.FLYOUT_CLOSED, { flyout });
  }
  modalOpened(modal: string) {
    this.track(EventType.MODAL_OPENED, { modal });
  }
  modalClosed() {
    this.track(EventType.MODAL_CLOSED);
  }
  eisModelViewed(modelId: string) {
    this.track(EventType.EIS_MODEL_VIEWED, { model_id: modelId });
  }
}
