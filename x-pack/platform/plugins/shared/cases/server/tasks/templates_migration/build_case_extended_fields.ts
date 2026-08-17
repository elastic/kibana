/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-exports from the canonical location in `common/utils/template_fields`.
 *
 * The implementation was moved to `common/` so that the write-time adapter in the cases client
 * layer can share the same helpers without creating a dependency on task-scoped code.
 * This re-export keeps `run_case_backfill.ts` (and its tests) unchanged.
 */
export { buildExtendedFieldsBackfill } from '../../../common/utils/template_fields';
