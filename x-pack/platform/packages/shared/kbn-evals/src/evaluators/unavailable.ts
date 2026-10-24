/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Label for a cell an evaluator could not score. The score is always `null`, never `0`: a judge
 * failure is not evidence that the candidate failed, and scoring it 0 would deflate the metric
 * while a `null` leaves the cell out of the denominator as an explicit coverage gap.
 */
export const UNAVAILABLE_LABEL = 'unavailable';
