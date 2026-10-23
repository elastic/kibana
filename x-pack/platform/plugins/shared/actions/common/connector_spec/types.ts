/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope } from '@kbn/connector-specs';
import type { LicenseType } from '@kbn/licensing-types';

/** Availability flags copied from the action type registry `list()` row. */
export interface ConnectorSpecAvailability {
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  isDeprecated: boolean;
}

/** Lightweight action listing used by summary responses (no input schema). */
export interface ConnectorSpecActionSummary {
  name: string;
  description?: string;
  isTool: boolean;
  scope: ActionScope;
}

/** Action listing plus the JSON Schema of the action input. */
export interface ConnectorSpecActionDetail extends ConnectorSpecActionSummary {
  inputSchema: Record<string, unknown>;
}

/** Spec-backed connector type without form or action input schemas. */
export interface ConnectorSpecSummary {
  id: string;
  displayName: string;
  description: string;
  icon?: string;
  docsUrl?: string;
  minimumLicense: LicenseType;
  isTechnicalPreview: boolean;
  supportedFeatureIds: string[];
  availability: ConnectorSpecAvailability;
  authTypeIds: string[];
  isTestable: boolean;
  hasInboundEvents: boolean;
  isInboundOnly: boolean;
  isEarsExperimental: boolean;
  actions: ConnectorSpecActionSummary[];
}

/** Full spec-backed connector type including form schema and action input schemas. */
export interface ConnectorSpecDetail
  extends Omit<ConnectorSpecSummary, 'actions' | 'availability'> {
  formSchema: Record<string, unknown>;
  actions: ConnectorSpecActionDetail[];
  /** Bundled agent skill text. Server only, never sent over HTTP. */
  skill?: string;
}
