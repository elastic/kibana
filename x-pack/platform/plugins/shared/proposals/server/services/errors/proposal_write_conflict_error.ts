/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from './proposal_conflict_error';

/**
 * Thrown when a guarded write lost to another write, as opposed to a guard
 * refusing the change. Only this one is worth retrying against a fresh load.
 *
 * A subclass of {@link ProposalConflictError} so it is still a 409 on the
 * routes and a `ConflictError` in a workflow. It keeps the parent's `name`,
 * because callers outside this plugin match conflicts by name rather than
 * class; only `instanceof` tells the two apart.
 */
export class ProposalWriteConflictError extends ProposalConflictError {}
