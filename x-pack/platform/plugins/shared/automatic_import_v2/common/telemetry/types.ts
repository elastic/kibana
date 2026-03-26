/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSource } from '../../public/components/telemetry_context';

/**
 * AIV2 Telemetry Event Types
 *
 * These events are sent to Elastic's telemetry cluster (BigQuery) for analytics.
 */
export enum AIV2TelemetryEventType {
  CreateIntegrationPageLoaded = 'aiv2_create_integration_page_loaded',
  DataStreamFlyoutOpened = 'aiv2_data_stream_flyout_opened',
  AnalyzeLogsTriggered = 'aiv2_analyze_logs_triggered',
  EditDataStreamFlyoutOpened = 'aiv2_edit_data_stream_flyout_opened',
  EditPipelineTabOpened = 'aiv2_edit_pipeline_tab_opened',
  PipelineEdited = 'aiv2_pipeline_edited',
  CodeEditorCopyClicked = 'aiv2_code_editor_copy_clicked',
  DataStreamDeleteConfirmed = 'aiv2_data_stream_delete_confirmed',
  DataStreamRefreshConfirmed = 'aiv2_data_stream_refresh_confirmed',
  CancelButtonClicked = 'aiv2_cancel_button_clicked',
  DoneButtonClicked = 'aiv2_done_button_clicked',

  // Server events
  DataStreamCreationComplete = 'aiv2_data_stream_creation_complete',
  IntegrationInstalled = 'aiv2_integration_installed',

  // Fleet Events
  ManageIntegrationsTableViewed = 'aiv2_manage_integrations_table_viewed',
  UploadIntegrationClicked = 'aiv2_upload_integration_clicked',
  IntegrationDeleteConfirmed = 'aiv2_integration_delete_confirmed',
  ReviewApproveMenuClicked = 'aiv2_review_approve_menu_clicked',
  IntegrationDownloadZipClicked = 'aiv2_integration_download_zip_clicked',
  ApproveModalCancelClicked = 'aiv2_approve_modal_cancel_clicked',
  ApproveModalApproveClicked = 'aiv2_approve_modal_approve_clicked',
}

export interface CreateIntegrationPageLoadedPayload {
  sessionId: string;
}

export interface DataStreamFlyoutOpenedPayload {
  sessionId: string;
  /** Boolean flag if this is the first data stream being created for a new integration */
  isFirstDataStream: boolean;
}

export interface EditDataStreamFlyoutOpenedPayload {
  sessionId: string;
}

export interface AnalyzeLogsTriggeredPayload {
  sessionId: string;
  logsSource: LogsSource;
}

export interface EditPipelineTabOpenedPayload {
  sessionId: string;
}

export interface CodeEditorCopyClickedPayload {
  sessionId: string;
}

export interface DataStreamCreationCompletePayload {
  sessionId: string;
  integrationId: string;
  integrationName: string;
  dataStreamId: string;
  dataStreamName: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface IntegrationInstalledPayload {
  sessionId: string;
  integrationName: string;
  version: string;
  dataStreamCount: number;
  dataStreamName: string;
}

export type ManageIntegrationsTableViewedPayload = Record<string, never>;
export type UploadIntegrationClickedPayload = Record<string, never>;

export interface CancelButtonClickedPayload {
  sessionId: string;
}

export interface DoneButtonClickedPayload {
  sessionId: string;
}

export type ReviewApproveMenuClickedPayload = Record<string, never>;
export type IntegrationDownloadZipClickedPayload = Record<string, never>;
export type ApproveModalCancelClickedPayload = Record<string, never>;
export type ApproveModalApproveClickedPayload = Record<string, never>;
export type IntegrationDeleteConfirmedPayload = Record<string, never>;
export interface DataStreamDeleteConfirmedPayload {
  sessionId: string;
}

export interface DataStreamRefreshConfirmedPayload {
  sessionId: string;
}

export interface PipelineEditedPayload {
  sessionId: string;
  linesAdded: number;
  linesRemoved: number;
  netLineChange: number;
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
    : T extends AIV2TelemetryEventType.CancelButtonClicked
    ? CancelButtonClickedPayload
    : T extends AIV2TelemetryEventType.DoneButtonClicked
    ? DoneButtonClickedPayload
    : T extends AIV2TelemetryEventType.DataStreamCreationComplete
    ? DataStreamCreationCompletePayload
    : T extends AIV2TelemetryEventType.IntegrationInstalled
    ? IntegrationInstalledPayload
    : T extends AIV2TelemetryEventType.ManageIntegrationsTableViewed
    ? ManageIntegrationsTableViewedPayload
    : T extends AIV2TelemetryEventType.UploadIntegrationClicked
    ? UploadIntegrationClickedPayload
    : T extends AIV2TelemetryEventType.ReviewApproveMenuClicked
    ? ReviewApproveMenuClickedPayload
    : T extends AIV2TelemetryEventType.IntegrationDownloadZipClicked
    ? IntegrationDownloadZipClickedPayload
    : T extends AIV2TelemetryEventType.ApproveModalCancelClicked
    ? ApproveModalCancelClickedPayload
    : T extends AIV2TelemetryEventType.ApproveModalApproveClicked
    ? ApproveModalApproveClickedPayload
    : T extends AIV2TelemetryEventType.IntegrationDeleteConfirmed
    ? IntegrationDeleteConfirmedPayload
    : T extends AIV2TelemetryEventType.DataStreamDeleteConfirmed
    ? DataStreamDeleteConfirmedPayload
    : T extends AIV2TelemetryEventType.DataStreamRefreshConfirmed
    ? DataStreamRefreshConfirmedPayload
    : T extends AIV2TelemetryEventType.PipelineEdited
    ? PipelineEditedPayload
    : never;
