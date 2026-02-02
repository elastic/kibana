/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/function';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { stripCustomIdentifiers } from './strip_custom_identifiers';
import { stripUpdatedAt } from './strip_updated_at';

/**
 * Sanitises the DSL for display in the editor by removing internal/server-managed fields.
 * Strips:
 * - customIdentifier from all steps (internal tracking IDs)
 * - updated_at from the DSL root (server-managed timestamp)
 */
export const sanitiseForEditing = (dsl: StreamlangDSL): StreamlangDSL =>
  pipe(dsl, stripCustomIdentifiers, stripUpdatedAt);
