/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnServerlessProjectType } from '@kbn/dev-utils';

export const COMMON_HEADERS = {
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const COMMON_UNSAFE_HEADERS = {
  ...COMMON_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
};

/** Maps the `--serverless=` project type onto the one the UIAM certificates are named for. */
export const UIAM_PROJECT_TYPES: Readonly<Record<string, KbnServerlessProjectType>> = {
  es: 'search',
  oblt: 'observability',
  security: 'security',
  vectordb: 'vectordb',
};
