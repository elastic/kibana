/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';

/**
 * Strips the updated_at field from the DSL.
 * This server-managed timestamp should not be displayed in the editor.
 */
export function stripUpdatedAt(dsl: StreamlangDSL): StreamlangDSL {
  const { updated_at, ...rest } = dsl as StreamlangDSL & { updated_at?: string };
  return rest;
}
