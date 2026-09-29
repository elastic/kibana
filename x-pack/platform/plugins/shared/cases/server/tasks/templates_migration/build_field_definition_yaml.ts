/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-exports from the canonical location in `server/common/utils/field_definitions`.
 *
 * The implementation was moved to `server/common/` so that the configure client layer can share
 * the same helper without creating a dependency on task-scoped code. This re-export keeps
 * `migrate_configuration.ts` (and its tests) unchanged.
 */
export { buildFieldDefinitionYaml } from '../../common/utils/field_definitions';
