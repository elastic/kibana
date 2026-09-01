/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { thresholdBuilderTypeDefinition } from './threshold';
import type { RegisteredBuilderType } from './types';

/**
 * Builder types owned by the RnA project, registered during alerting v2 setup.
 * Other teams register their own via `AlertingServerSetup.registerBuilderType`.
 */
export const BUILTIN_BUILDER_TYPES: readonly RegisteredBuilderType[] = [
  thresholdBuilderTypeDefinition,
] as const;
