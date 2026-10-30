/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

// Per-process token: Playwright runs each worker in its own process and separate runs can share
// one deployment, so isolating index/pipeline names keeps concurrent runs from clobbering each other.
export const RUN_NAMESPACE = randomUUID();

export const namespaceIndex = (indexName: string) => `${indexName}-${RUN_NAMESPACE}`;
