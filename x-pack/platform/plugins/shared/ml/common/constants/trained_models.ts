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
