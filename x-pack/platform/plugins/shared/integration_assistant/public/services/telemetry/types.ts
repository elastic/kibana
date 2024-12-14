/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Event type definitions
export enum TelemetryEventType {
  UploadIntegrationZipComplete = 'upload_integration_zip_complete',
  IntegrationAssistantOpen = 'integration_assistant_open',
  IntegrationAssistantStepComplete = 'integration_assistant_step_complete',
  IntegrationAssistantGenerationComplete = 'integration_assistant_generation_complete',
  IntegrationAssistantCelGenerationComplete = 'integration_assistant_cel_generation_complete',
  IntegrationAssistantComplete = 'integration_assistant_complete',
}

// Event data definitions

interface UploadIntegrationZipCompleteData {
  integrationName?: string;
  errorMessage?: string;
}

interface IntegrationAssistantOpenData {
  sessionId: string;
}

interface IntegrationAssistantStepCompleteData {
  sessionId: string;
  step: number;
  stepName: string;
  durationMs: number; // Time spent in the current step
  sessionElapsedTime: number; // Total time spent in the current generation session
}

interface IntegrationAssistantGenerationCompleteData {
  sessionId: string;
  sampleRows: number;
  durationMs: number;
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

interface IntegrationAssistantCelGenerationCompleteData {
  sessionId: string;
  durationMs: number;
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

interface IntegrationAssistantCompleteData {
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
    : T extends TelemetryEventType.IntegrationAssistantOpen
    ? IntegrationAssistantOpenData
    : T extends TelemetryEventType.IntegrationAssistantStepComplete
    ? IntegrationAssistantStepCompleteData
    : T extends TelemetryEventType.IntegrationAssistantGenerationComplete
    ? IntegrationAssistantGenerationCompleteData
    : T extends TelemetryEventType.IntegrationAssistantCelGenerationComplete
    ? IntegrationAssistantCelGenerationCompleteData
    : T extends TelemetryEventType.IntegrationAssistantComplete
    ? IntegrationAssistantCompleteData
    : never;
