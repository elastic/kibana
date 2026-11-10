/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The sample data sets whose overview dashboards are in the corpus. The dashboard IDs are read from
 * `GET /api/sample_data` at capture time (`overviewDashboard`), not hard-coded.
 */
export const SAMPLE_DATA_SETS = ['flights', 'logs', 'ecommerce'] as const;

export type SampleDataSetId = (typeof SAMPLE_DATA_SETS)[number];
