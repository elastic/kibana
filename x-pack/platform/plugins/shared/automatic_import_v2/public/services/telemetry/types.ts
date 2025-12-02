/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Prospective Event type definitions
export enum TelemetryEventType {
  IntegrationManagementOpen = 'integration_management_open',
  CreateManageDataStreamFlyoutOpen = 'create_manage_data_stream_flyout_open',
  UploadDatastreamLogsZipCompleteData = 'upload_integration_logs_zip_complete',
  ViewResultsFlyoutOpen = 'view_results_flyout_open',
  AutomaticImportComplete = 'automatic_import_complete',
}

// Prospective rough draft event data definitions
interface IntegrationManagementOpenData {
  sessionId: string;
}

interface CreateManageDataStreamFlyoutOpenData {
  sessionId: string;
  datastreamName: string;
}

interface UploadDatastreamLogsZipCompleteData {
  datastreamName: string;
  errorMessage?: string;
}

interface ViewResultsFlyoutOpenData {
  sessionId: string;
  datastreamName: string;
  sampleRows: number;
  errorMessage?: string;
  model: string;
  provider: string;
}

interface AutomaticImportCompleteData {
  sessionId: string;
  integrationName: string;
  integrationDescription: string;
  dataStreamNames: string[];
  inputTypes: string[];
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

/**
 * TelemetryEventTypeData
 * Defines the relation between event types and their corresponding event data
 * */
export type TelemetryEventTypeData<T extends TelemetryEventType> =
  T extends TelemetryEventType.IntegrationManagementOpen
    ? IntegrationManagementOpenData
    : T extends TelemetryEventType.UploadDatastreamLogsZipCompleteData
    ? UploadDatastreamLogsZipCompleteData
    : T extends TelemetryEventType.CreateManageDataStreamFlyoutOpen
    ? CreateManageDataStreamFlyoutOpenData
    : T extends TelemetryEventType.ViewResultsFlyoutOpen
    ? ViewResultsFlyoutOpenData
    : T extends TelemetryEventType.AutomaticImportComplete
    ? AutomaticImportCompleteData
    : never;
