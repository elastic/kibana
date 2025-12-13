/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simplified IndexTemplate interface for the classic stream flyout.
 * This is a subset of TemplateDeserialized from @kbn/index-management-plugin
 * to avoid circular dependencies.
 */

/**
 * Data retention settings for an index template
 */
export interface DataRetention {
  enabled: boolean;
  infiniteDataRetention?: boolean;
  value?: number;
  unit?: string;
}

/**
 * Index mode options
 */
export const IndexMode = {
  standard: 'standard',
  logsdb: 'logsdb',
  time_series: 'time_series',
  lookup: 'lookup',
} as const;

export type IndexMode = (typeof IndexMode)[keyof typeof IndexMode];

/**
 * Template type classification
 */
export type TemplateType = 'default' | 'managed' | 'cloudManaged' | 'system';

/**
 * Simplified index template interface containing only the fields
 * required by the create classic stream flyout component.
 */
export interface IndexTemplate {
  name: string;
  indexPatterns: string[];
  ilmPolicy?: {
    name: string;
  };
  lifecycle?: DataRetention;
  allowAutoCreate: string;
  indexMode?: IndexMode;
  version?: number;
  composedOf?: string[];
  _kbnMeta: {
    type: TemplateType;
    hasDatastream: boolean;
  };
}
