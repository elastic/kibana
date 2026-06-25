/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when the number of distinct values for a permission field exceeds the
 * enumeration ceiling (`maxPages * pageSize`). Hitting this means the corpus
 * has grown beyond what the request-scoped pre-aggregation can safely
 * enumerate; the search fails closed rather than authorize against a truncated
 * universe.
 */
export class SmlCorpusTooLargeError extends SmlError {}
