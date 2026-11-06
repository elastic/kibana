/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when a write targets an unregistered `attachmentType`. Deletes
 * intentionally do not throw this — they must work even when the registering
 * plugin is disabled.
 */
export class SmlUnregisteredTypeError extends SmlError {}
