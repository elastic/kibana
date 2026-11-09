/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default page for the trained_models endpoint is 100,
 * which is too small for the most cases, so we set it to 10000.
 */
export const DEFAULT_TRAINED_MODELS_PAGE_SIZE = 10000;

/**
 * The test UI sends one document, or about ten from an index sample.
 * 100 leaves room to paste a batch in the editor without allowing thousands.
 */
export const PIPELINE_SIMULATE_MAX_DOCS = 100;

/**
 * A normal simulation returns the input plus inference output, which stays
 * within a few megabytes. 10 MB stops a processor from expanding that into
 * a response large enough to stall Kibana.
 */
export const PIPELINE_SIMULATE_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
