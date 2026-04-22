/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Intermediate representation each per-processor converter returns. The
 * dispatcher groups contiguous emissions of the same kind into a single OTel
 * processor instance, preserving order.
 */
export type Emission =
  | { kind: 'transform'; statements: string[] }
  | { kind: 'filter'; conditions: string[] }
  | { kind: 'unsupported'; action: string; reason: string };
