/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQueryKql } from '@kbn/streams-schema';

export type Flow = 'manual' | 'ai';

export type SaveData =
  | { type: 'single'; query: StreamQueryKql; isUpdating?: boolean }
  | { type: 'multiple'; queries: StreamQueryKql[] };
