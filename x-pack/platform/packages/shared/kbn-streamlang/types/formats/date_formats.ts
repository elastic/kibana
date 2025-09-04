/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A list of common date format keywords supported by Streamlang.
 * Useful for interoperability purposes, for example Ingest Pipelines Date Processor supports these
 * but not others e.g. ES|QL.
 */
export const commonDatePresets = [
  'ISO8601',
  'UNIX',
  'UNIX_MS',
  'RFC1123',
  'YYYY-MM-DD',
  'COMMON_LOG',
] as const;

export type CommonDatePreset = (typeof commonDatePresets)[number];
