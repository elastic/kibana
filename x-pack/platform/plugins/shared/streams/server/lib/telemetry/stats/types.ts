/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Telemetry data for Streams usage statistics
 */
export interface StreamsStatsTelemetry {
  classic_streams: {
    /** Number of classic streams that have been modified from their default configuration */
    changed_count: number;
    /** Number of classic streams that have custom processing steps configured */
    with_processing_count: number;
    /** Number of classic streams that have custom field overrides configured */
    with_fields_count: number;
    /** Number of classic streams that with non-default retention settings (not inherited) */
    with_changed_retention_count: number;
  };
  wired_streams: {
    /** Total number of wired streams in the system */
    count: number;
  };
}
