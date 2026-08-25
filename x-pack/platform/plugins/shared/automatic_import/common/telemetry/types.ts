/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSource } from '../../public/components/telemetry_context';

/**
 * Automatic Import telemetry event types
 *
 * These events are sent to Elastic's telemetry cluster (BigQuery) for analytics.
 */
export enum AutomaticImportTelemetryEventType {
  CreateIntegrationPageLoaded = 'automatic_import_create_integration_page_loaded',
  EditIntegrationPageLoaded = 'automatic_import_edit_integration_page_loaded',
  DataStreamFlyoutOpened = 'automatic_import_data_stream_flyout_opened',
  AnalyzeLogsTriggered = 'automatic_import_analyze_logs_triggered',
  EditDataStreamFlyoutOpened = 'automatic_import_edit_data_stream_flyout_opened',
  EditPipelineTabOpened = 'automatic_import_edit_pipeline_tab_opened',
  PipelineEdited = 'automatic_import_pipeline_edited',
  CodeEditorCopyClicked = 'automatic_import_code_editor_copy_clicked',
  DataStreamDeleteConfirmed = 'automatic_import_data_stream_delete_confirmed',
  DataStreamRefreshConfirmed = 'automatic_import_data_stream_refresh_confirmed',
  CancelButtonClicked = 'automatic_import_cancel_button_clicked',
  DoneButtonClicked = 'automatic_import_done_button_clicked',

  // Server events
  DataStreamCreationComplete = 'automatic_import_data_stream_creation_complete',
  IntegrationInstalled = 'automatic_import_integration_installed',

  // Fleet Events
  ManageIntegrationsTableViewed = 'automatic_import_manage_integrations_table_viewed',
  UploadIntegrationClicked = 'automatic_import_upload_integration_clicked',
  ReviewApproveMenuClicked = 'automatic_import_review_approve_menu_clicked',
  IntegrationDownloadZipClicked = 'automatic_import_integration_download_zip_clicked',
  ApproveModalCancelClicked = 'automatic_import_approve_modal_cancel_clicked',
  ApproveModalApproveClicked = 'automatic_import_approve_modal_approve_clicked',
  ApproveModalApproveWithAutoInstallClicked = 'automatic_import_approve_modal_approve_with_auto_install_clicked',
}

export interface CreateIntegrationPageLoadedPayload {
  sessionId?: string;
}

export interface EditIntegrationPageLoadedPayload {
  sessionId?: string;
  integrationId?: string;
}

export interface DataStreamFlyoutOpenedPayload {
  sessionId?: string;
  integrationId?: string;
}

export interface EditDataStreamFlyoutOpenedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
}

export interface AnalyzeLogsTriggeredPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
  logsSource: LogsSource;
  inputTypes: string[];
}

export interface EditPipelineTabOpenedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
}

export interface CodeEditorCopyClickedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
}

export interface DataStreamCreationCompletePayload {
  sessionId?: string;
  integrationId: string;
  integrationName: string;
  dataStreamId: string;
  dataStreamName: string;
  connectorId: string;
  modelName?: string;
  connectorType?: string;
  connectorName?: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface IntegrationInstalledPayload {
  sessionId?: string;
  integrationName: string;
  version: string;
  dataStreamCount: number;
  dataStreamName: string;
}

export type ManageIntegrationsTableViewedPayload = Record<string, never>;
export type UploadIntegrationClickedPayload = Record<string, never>;

export interface CancelButtonClickedPayload {
  sessionId?: string;
  integrationId?: string;
}

export interface DoneButtonClickedPayload {
  sessionId?: string;
  integrationId?: string;
}

export interface ReviewApproveMenuClickedPayload {
  integrationId?: string;
  version?: string;
}

export interface IntegrationDownloadZipClickedPayload {
  integrationId?: string;
}

export interface ApproveModalCancelClickedPayload {
  integrationId?: string;
}

export interface ApproveModalApproveClickedPayload {
  integrationId?: string;
  version?: string;
  dataStreamCount: number;
}

/** User approved with "Automatically install integration after approval" checked; fires after approve API succeeds, before install. */
export type ApproveModalApproveWithAutoInstallClickedPayload = ApproveModalApproveClickedPayload;

export interface DataStreamDeleteConfirmedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
}

export interface DataStreamRefreshConfirmedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
}

export interface PipelineEditedPayload {
  sessionId?: string;
  integrationId?: string;
  dataStreamId?: string;
  linesAdded: number;
  linesRemoved: number;
  netLineChange: number;
}

export type AutomaticImportTelemetryEventPayload<T extends AutomaticImportTelemetryEventType> =
  T extends AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded
    ? CreateIntegrationPageLoadedPayload
    : T extends AutomaticImportTelemetryEventType.EditIntegrationPageLoaded
    ? EditIntegrationPageLoadedPayload
    : T extends AutomaticImportTelemetryEventType.DataStreamFlyoutOpened
    ? DataStreamFlyoutOpenedPayload
    : T extends AutomaticImportTelemetryEventType.EditDataStreamFlyoutOpened
    ? EditDataStreamFlyoutOpenedPayload
    : T extends AutomaticImportTelemetryEventType.AnalyzeLogsTriggered
    ? AnalyzeLogsTriggeredPayload
    : T extends AutomaticImportTelemetryEventType.EditPipelineTabOpened
    ? EditPipelineTabOpenedPayload
    : T extends AutomaticImportTelemetryEventType.CodeEditorCopyClicked
    ? CodeEditorCopyClickedPayload
    : T extends AutomaticImportTelemetryEventType.CancelButtonClicked
    ? CancelButtonClickedPayload
    : T extends AutomaticImportTelemetryEventType.DoneButtonClicked
    ? DoneButtonClickedPayload
    : T extends AutomaticImportTelemetryEventType.DataStreamCreationComplete
    ? DataStreamCreationCompletePayload
    : T extends AutomaticImportTelemetryEventType.IntegrationInstalled
    ? IntegrationInstalledPayload
    : T extends AutomaticImportTelemetryEventType.ManageIntegrationsTableViewed
    ? ManageIntegrationsTableViewedPayload
    : T extends AutomaticImportTelemetryEventType.UploadIntegrationClicked
    ? UploadIntegrationClickedPayload
    : T extends AutomaticImportTelemetryEventType.ReviewApproveMenuClicked
    ? ReviewApproveMenuClickedPayload
    : T extends AutomaticImportTelemetryEventType.IntegrationDownloadZipClicked
    ? IntegrationDownloadZipClickedPayload
    : T extends AutomaticImportTelemetryEventType.ApproveModalCancelClicked
    ? ApproveModalCancelClickedPayload
    : T extends AutomaticImportTelemetryEventType.ApproveModalApproveClicked
    ? ApproveModalApproveClickedPayload
    : T extends AutomaticImportTelemetryEventType.ApproveModalApproveWithAutoInstallClicked
    ? ApproveModalApproveWithAutoInstallClickedPayload
    : T extends AutomaticImportTelemetryEventType.DataStreamDeleteConfirmed
    ? DataStreamDeleteConfirmedPayload
    : T extends AutomaticImportTelemetryEventType.DataStreamRefreshConfirmed
    ? DataStreamRefreshConfirmedPayload
    : T extends AutomaticImportTelemetryEventType.PipelineEdited
    ? PipelineEditedPayload
    : never;
