/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Safely parse a JSON attribute value.
 * Returns undefined if the value is not a string or if JSON parsing fails.
 * This prevents exceptions from malformed attributes from propagating.
 */
export declare function parseJsonAttr<T>(value: unknown): T | undefined;
