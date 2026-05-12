/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes } from '@opentelemetry/api';

/**
 * Set of metadata that can be used then calling the inference APIs
 *
 * @public
 */
export interface ChatCompleteMetadata {
  connectorTelemetry?: ConnectorTelemetryMetadata;
  anonymization?: ChatCompleteAnonymizationMetadata;
  attributes?: Attributes;
}

/**
 * Pass through for the connector telemetry
 */
export interface ConnectorTelemetryMetadata {
  pluginId?: string;
  aggregateBy?: string;
}

export interface ChatCompleteAnonymizationTarget {
  targetType: 'data_view' | 'index_pattern' | 'index';
  targetId: string;
}

/**
 * Optional anonymization metadata consumers can pass so inference can resolve
 * field-based policy for a target.
 */
export interface ChatCompleteAnonymizationMetadata {
  profileId?: string;
  replacementsId?: string;
  target?: ChatCompleteAnonymizationTarget;
  /**
   * Session identifier for cross-turn determinism in the workflow-driven
   * anonymization path. When provided, all PII tokens in the same session
   * are stable across turns (e.g. conversationId from Agent Builder).
   */
  sessionId?: string;
}
