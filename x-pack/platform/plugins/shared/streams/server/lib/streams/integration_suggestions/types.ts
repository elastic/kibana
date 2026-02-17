/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A mapping entry from a technology identifier to a Fleet integration package
 */
export interface TechnologyPackageMapping {
  /** The Fleet package name (e.g. 'mysql_otel', 'nginx_otel') */
  packageName: string;
  /** Alternative technology identifiers that map to this package */
  aliases?: string[];
  /** Benefits/features provided by installing this integration */
  benefits: string[];
  /** Documentation URL for the integration */
  docsUrl?: string;
}

/**
 * An integration suggestion based on detected features
 */
export interface IntegrationSuggestion {
  /** The Fleet package name */
  packageName: string;
  /** The display title of the package */
  packageTitle: string;
  /** Confidence score from the matched feature (0-100) */
  confidence: number;
  /** The feature ID that triggered this suggestion */
  featureId: string;
  /** Human-readable title of the matched feature */
  featureTitle: string;
  /** OTel receiver config YAML snippet (if available) */
  otelConfig?: string;
  /** Benefits of installing this integration */
  benefits: string[];
  /** Documentation URL */
  docsUrl?: string;
}

/**
 * Result of getting integration suggestions for a stream
 */
export interface IntegrationSuggestionsResult {
  /** The stream name this result is for */
  streamName: string;
  /** Matched integration suggestions sorted by confidence (descending) */
  suggestions: IntegrationSuggestion[];
}
