/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import {
  CUSTOM_CONTENT_PANEL_ADDED,
  CUSTOM_CONTENT_EDIT_FLYOUT_OPENED,
  CUSTOM_CONTENT_PANEL_SAVED,
  CUSTOM_CONTENT_EDIT_CANCELLED,
  CUSTOM_CONTENT_GENERATE_WITH_CHAT_CLICKED,
  CUSTOM_CONTENT_AGENT_UPDATE_APPLIED,
} from './event_types';

export class CustomContentTelemetryService {
  constructor(private readonly _analytics: AnalyticsServiceStart) {}

  private _reportEvent(eventType: string, eventData: Record<string, unknown>) {
    try {
      this._analytics.reportEvent(eventType, eventData);
    } catch {
      // swallow telemetry errors — never break the feature
    }
  }

  trackPanelAdded(source: 'dashboard_panel' | 'agent_generated') {
    this._reportEvent(CUSTOM_CONTENT_PANEL_ADDED, { source });
  }

  trackEditFlyoutOpened(params: {
    isNewPanel: boolean;
    hasTemplate: boolean;
    hasEsqlQuery: boolean;
  }) {
    this._reportEvent(CUSTOM_CONTENT_EDIT_FLYOUT_OPENED, {
      is_new_panel: params.isNewPanel,
      has_template: params.hasTemplate,
      has_esql_query: params.hasEsqlQuery,
    });
  }

  trackPanelSaved(params: {
    isNewPanel: boolean;
    hasTemplate: boolean;
    hasEsqlQuery: boolean;
    templateSizeBytes: number;
  }) {
    this._reportEvent(CUSTOM_CONTENT_PANEL_SAVED, {
      is_new_panel: params.isNewPanel,
      has_template: params.hasTemplate,
      has_esql_query: params.hasEsqlQuery,
      template_size_bytes: params.templateSizeBytes,
    });
  }

  trackEditCancelled(params: { isNewPanel: boolean; panelRemoved: boolean }) {
    this._reportEvent(CUSTOM_CONTENT_EDIT_CANCELLED, {
      is_new_panel: params.isNewPanel,
      panel_removed: params.panelRemoved,
    });
  }

  trackGenerateWithChatClicked(params: {
    triggerSource: 'empty_panel' | 'flyout';
    hasExistingTemplate: boolean;
  }) {
    this._reportEvent(CUSTOM_CONTENT_GENERATE_WITH_CHAT_CLICKED, {
      trigger_source: params.triggerSource,
      has_existing_template: params.hasExistingTemplate,
    });
  }

  trackAgentUpdateApplied(params: { hasEsqlQuery: boolean; templateSizeBytes: number }) {
    this._reportEvent(CUSTOM_CONTENT_AGENT_UPDATE_APPLIED, {
      has_esql_query: params.hasEsqlQuery,
      template_size_bytes: params.templateSizeBytes,
    });
  }
}
