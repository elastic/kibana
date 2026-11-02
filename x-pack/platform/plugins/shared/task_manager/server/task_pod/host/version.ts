/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';

/**
 * The Kibana version this pod runs as (`POD_KIBANA_VERSION` overrides it). Kibana sends its own
 * version with every run and the pod refuses a mismatch, since task state schemas and saved object
 * migrations are versioned with Kibana.
 */
export const POD_KIBANA_VERSION: string =
  process.env.POD_KIBANA_VERSION ?? kibanaPackageJson.version;
