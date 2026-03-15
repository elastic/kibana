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
 * They track integration installations with pipeline metadata.
 */
export enum AIV2TelemetryEventType {
  CreateIntegrationPageLoaded = 'aiv2_create_integration_page_loaded',
  IntegrationInstalled = 'aiv2_integration_installed',
}

export interface CreateIntegrationPageLoadedPayload {
  sessionId: string;
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
    : T extends AIV2TelemetryEventType.IntegrationInstalled
    ? IntegrationInstalledPayload
    : never;
