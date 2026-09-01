/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builder identifier. The same value is used for the server definition and the
 * browser UI, and is what `metadata.builder_type` carries on saved rules.
 */
export const APM_LATENCY_BUILDER_TYPE = 'apm_latency';

/** Transaction documents the generated query reads from. */
export const APM_TRANSACTION_INDEX = 'traces-apm*';

export const APM_TIME_FIELD = '@timestamp';

export const SERVICE_NAME_FIELD = 'service.name';
export const SERVICE_ENVIRONMENT_FIELD = 'service.environment';
export const TRANSACTION_TYPE_FIELD = 'transaction.type';
export const TRANSACTION_NAME_FIELD = 'transaction.name';
export const TRANSACTION_DURATION_FIELD = 'transaction.duration.us';

/** Column the generated query exposes the measured latency under. */
export const LATENCY_COLUMN = 'latency_ms';

export const LATENCY_PERCENTILES = [50, 75, 90, 95, 99] as const;

export const MAX_FIELD_VALUE_LENGTH = 1024;

/** A latency threshold above this is a configuration mistake rather than an alert. */
export const MAX_THRESHOLD_MS = 3_600_000;
