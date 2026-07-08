/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContextEngineError } from './error';

/**
 * Thrown when a content-mode write supplies a `permissions` value for an
 * `attachmentType` whose registered `ContextEngineTypeDefinition` also defines
 * `getPermissions`.
 */
export class ContextEnginePermissionsConflictError extends ContextEngineError {}
