/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One golden example for GEPA evaluation: input logs and expected pipeline output documents.
 */
export interface GoldenExample {
  id: string;
  input_logs: string[];
  expected_outputs: Record<string, unknown>[];
}

/**
 * Manifest that defines train/validation split by example id.
 */
export interface GoldenManifest {
  train: string[];
  val: string[];
}
