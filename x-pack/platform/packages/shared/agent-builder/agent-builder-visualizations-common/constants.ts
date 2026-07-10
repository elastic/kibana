/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VISUALIZATION_ATTACHMENT_TYPE = 'visualization';

/**
 * Upper bound for a serialized Vega/Vega-Lite spec. Generous enough for layered /
 * faceted specs, but bounded so an oversized spec cannot be stored (in a
 * visualization attachment or a by-value dashboard Vega panel), closing the
 * unbounded-string DoS vector.
 */
export const MAX_VEGA_SPEC_LENGTH = 100_000;
