/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';

/** Auto-approved API selectors, keyed by backend. */
export type AutoApprovedApisValue = Partial<Record<ApiTarget, string[]>>;
