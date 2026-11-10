/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The sample data sets the gate's panels read, installed at the corpus's `now` for A-data. */
export const SAMPLE_DATA_SETS = ['logs'] as const;

export type SampleDataSetId = (typeof SAMPLE_DATA_SETS)[number];
