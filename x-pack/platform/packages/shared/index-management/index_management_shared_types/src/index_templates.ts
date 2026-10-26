/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TemplateType = 'default' | 'managed' | 'cloudManaged' | 'system';

export const IndexMode = {
  standard: 'standard',
  logsdb: 'logsdb',
  time_series: 'time_series',
  lookup: 'lookup',
} as const;

export type IndexMode = (typeof IndexMode)[keyof typeof IndexMode];

export interface DataRetention {
  enabled: boolean;
  infiniteDataRetention?: boolean;
  value?: number;
  unit?: string;
}

/**
 * Interface for the template list returned by Index Management's
 * `GET /api/index_management/index_templates` endpoint.
 *
 * This is a copy of the plugin's TemplateListItem interface with additional fields added during deserialization,
 * kept here to allow cross-plugin consumption without creating cyclic dependencies.
 */
export interface TemplateListItem {
  name: string;
  indexPatterns: string[];
  version?: number;
  order?: number; // Legacy template only
  priority?: number; // Composable template only
  hasSettings: boolean;
  hasAliases: boolean;
  hasMappings: boolean;
  deprecated?: boolean;
  ilmPolicy?: {
    name: string;
  };
  composedOf?: string[]; // Composable template only
  _kbnMeta: {
    type: TemplateType;
    hasDatastream: boolean;
    isLegacy?: boolean;
  };
  // These are not present in original TemplateListItem interface,
  // but are added by deserializeTemplate and deserializeLegacyTemplate in the final response.
  lifecycle?: DataRetention;
  ignoreMissingComponentTemplates?: string[];
  allowAutoCreate: string;
  indexMode?: IndexMode;
  _meta?: { [key: string]: any }; // Composable template only
  // Composable template only
  dataStream?: {
    hidden?: boolean;
    [key: string]: any;
  };
}

export interface GetIndexTemplatesResponse {
  templates: TemplateListItem[];
  legacyTemplates: TemplateListItem[];
}
