/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare function isJSONObject(obj: unknown): obj is Record<string, unknown>;
export declare function isString(value: unknown): value is string;
export declare function isBoolean(value: unknown): value is boolean;
export declare function isNumber(value: unknown): value is number;
export declare function isStringArray(value: unknown): value is string[];
export declare function isBooleanArray(value: unknown): value is boolean[];
