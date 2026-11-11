/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Identifier = string;

export type NonEmptyArray<T> = [T, ...T[]];

export interface DisplayFields {
  name?: string;
  description?: string;
}

export type RoutingMode = 'exclusive' | 'clone';

export type StreamlangCondition = Record<string, unknown>;
