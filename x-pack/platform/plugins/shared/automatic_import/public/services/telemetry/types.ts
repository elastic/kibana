/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Event type definitions
export enum TelemetryEventType {
  UploadIntegrationZipComplete = 'upload_integration_zip_complete',
  AutomaticImportOpen = 'automatic_import_open',
  AutomaticImportStepComplete = 'automatic_import_step_complete',
  AutomaticImportGenerationComplete = 'automatic_import_generation_complete',
  AutomaticImportCelGenerationComplete = 'automatic_import_cel_generation_complete',
  AutomaticImportComplete = 'automatic_import_complete',
}

// Event data definitions

interface UploadIntegrationZipCompleteData {
  integrationName?: string;
  errorMessage?: string;
}

interface AutomaticImportOpenData {
  sessionId: string;
}

interface AutomaticImportStepCompleteData {
  sessionId: string;
  step: number;
  stepName: string;
  durationMs: number; // Time spent in the current step
  sessionElapsedTime: number; // Total time spent in the current generation session
}

interface AutomaticImportGenerationCompleteData {
  sessionId: string;
  sampleRows: number;
  durationMs: number;
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

interface AutomaticImportCelGenerationCompleteData {
  sessionId: string;
  durationMs: number;
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

interface AutomaticImportCompleteData {
  sessionId: string;
  durationMs: number;
  integrationName: string;
  integrationDescription: string;
  dataStreamName: string;
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
  T extends TelemetryEventType.UploadIntegrationZipComplete
    ? UploadIntegrationZipCompleteData
    : T extends TelemetryEventType.AutomaticImportOpen
    ? AutomaticImportOpenData
    : T extends TelemetryEventType.AutomaticImportStepComplete
    ? AutomaticImportStepCompleteData
    : T extends TelemetryEventType.AutomaticImportGenerationComplete
    ? AutomaticImportGenerationCompleteData
    : T extends TelemetryEventType.AutomaticImportCelGenerationComplete
    ? AutomaticImportCelGenerationCompleteData
    : T extends TelemetryEventType.AutomaticImportComplete
    ? AutomaticImportCompleteData
    : never;
