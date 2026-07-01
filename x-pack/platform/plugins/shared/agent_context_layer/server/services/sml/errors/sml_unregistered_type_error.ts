/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when an origin-mode write targets an unregistered `attachmentType`.
 * Content-mode writes and deletes intentionally do not throw this — content mode
 * stamps empty permissions and warns; deletes must work even when the registering
 * plugin is disabled.
 */
export class SmlUnregisteredTypeError extends SmlError {}
