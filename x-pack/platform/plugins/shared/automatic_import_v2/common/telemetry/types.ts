/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AIV2 Telemetry Event Types
 *
 * These events are sent to Elastic's telemetry cluster (BigQuery) for analytics.
 */
export enum AIV2TelemetryEventType {
  CreateIntegrationPageLoaded = 'aiv2_create_integration_page_loaded',

  DataStreamFlyoutOpened = 'aiv2_data_stream_flyout_opened',
  EditDataStreamFlyoutOpened = 'aiv2_edit_data_stream_flyout_opened',
  AnalyzeLogsTriggered = 'aiv2_analyze_logs_triggered',

  EditPipelineTabOpened = 'aiv2_edit_pipeline_tab_opened',
  CodeEditorCopyClicked = 'aiv2_code_editor_copy_clicked',

  DataStreamCreationComplete = 'aiv2_data_stream_creation_complete',

  IntegrationInstalled = 'aiv2_integration_installed',
}

export interface CreateIntegrationPageLoadedPayload {
  sessionId: string;
}

export interface DataStreamFlyoutOpenedPayload {
  sessionId: string;
  integrationId: string;
}

export interface EditDataStreamFlyoutOpenedPayload {
  sessionId: string;
  integrationId: string;
  dataStreamId: string;
}

export interface AnalyzeLogsTriggeredPayload {
  sessionId: string;
  integrationId: string;
  dataStreamId: string;
}

export interface EditPipelineTabOpenedPayload {
  sessionId: string;
  integrationId: string;
  dataStreamId: string;
}

export interface CodeEditorCopyClickedPayload {
  sessionId: string;
  integrationId: string;
  dataStreamId: string;
}

export interface DataStreamCreationCompletePayload {
  sessionId: string;
  integrationId: string;
  dataStreamId: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface IntegrationInstalledPayload {
  sessionId: string;
  integrationName: string;
  version: string;
  dataStreamCount: number;
  dataStreamNames: string[];
  processorCount: number;
  processorTypes: string[];
}

export type AIV2EventPayload<T extends AIV2TelemetryEventType> =
  T extends AIV2TelemetryEventType.CreateIntegrationPageLoaded
    ? CreateIntegrationPageLoadedPayload
    : T extends AIV2TelemetryEventType.DataStreamFlyoutOpened
    ? DataStreamFlyoutOpenedPayload
    : T extends AIV2TelemetryEventType.EditDataStreamFlyoutOpened
    ? EditDataStreamFlyoutOpenedPayload
    : T extends AIV2TelemetryEventType.AnalyzeLogsTriggered
    ? AnalyzeLogsTriggeredPayload
    : T extends AIV2TelemetryEventType.EditPipelineTabOpened
    ? EditPipelineTabOpenedPayload
    : T extends AIV2TelemetryEventType.CodeEditorCopyClicked
    ? CodeEditorCopyClickedPayload
    : T extends AIV2TelemetryEventType.DataStreamCreationComplete
    ? DataStreamCreationCompletePayload
    : T extends AIV2TelemetryEventType.IntegrationInstalled
    ? IntegrationInstalledPayload
    : never;
