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
  significant_events: {
    /** Total number of significant event detection rules configured */
    rules_count: number;
    /** Total number of significant events detected and stored in the last collection period */
    stored_count: number;
    /** Number of unique wired streams that have significant events stored */
    unique_wired_streams_with_stored_count: number;
    /** Number of unique classic streams that have significant events stored */
    unique_classic_streams_with_stored_count: number;
    /** Average execution time in milliseconds for significant event rules in the last 24 hours */
    rule_execution_ms_avg_24h: number | null;
    /** 95th percentile execution time in milliseconds for significant event rules in the last 24 hours */
    rule_execution_ms_p95_24h: number | null;
    /** Total number of rule executions in the last 24 hours */
    executions_count_24h: number;
  };
}
