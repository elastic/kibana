/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `attributes` key that marks a Knowledge Indicator as excluded from agents. */
export const KI_EXCLUDED_ATTRIBUTE = 'excluded';

/** `attributes` key holding when the Knowledge Indicator was excluded, as an ISO-8601 string. */
export const KI_EXCLUDED_AT_ATTRIBUTE = 'excluded_at';

/** `attributes` key holding why the Knowledge Indicator was excluded. */
export const KI_EXCLUDED_REASON_ATTRIBUTE = 'excluded_reason';

/** ES|QL predicate that keeps only Knowledge Indicators that are not excluded; requires `attributes` to be mapped. */
export const KI_NOT_EXCLUDED_ESQL_PREDICATE = `FIELD_EXTRACT(attributes, "${KI_EXCLUDED_ATTRIBUTE}") IS NULL`;
