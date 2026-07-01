/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when a content-mode write supplies a `permissions` value for an
 * `attachmentType` whose registered `SmlTypeDefinition` also defines
 * `getPermissions`. The hook is always authoritative for hook-backed types —
 * this error surfaces the conflict loudly instead of silently discarding the
 * caller-supplied `permissions`, which would otherwise let a workflow author
 * believe their `permissions` field took effect when it did not.
 */
export class SmlPermissionsConflictError extends SmlError {}
