/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set of metadata that can be used then calling the inference APIs
 *
 * @public
 */
export interface ChatCompleteMetadata {
  connectorTelemetry?: ConnectorTelemetryMetadata;
}

/**
 * Pass through for the connector telemetry
 */
export interface ConnectorTelemetryMetadata {
  pluginId?: string;
  aggregateBy?: string;
}
