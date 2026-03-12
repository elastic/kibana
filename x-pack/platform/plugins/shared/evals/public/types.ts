/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';

export type EvalsPublicSetup = Record<string, never>;

export interface EvalsPublicStart {
  TraceWaterfall: ComponentType<{ traceId: string }>;
}

export type EvalsSetupDependencies = Record<string, never>;

export type EvalsStartDependencies = Record<string, never>;
