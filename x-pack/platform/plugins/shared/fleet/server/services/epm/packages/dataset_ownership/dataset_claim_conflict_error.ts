/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetError } from '../../../../../common/errors';

/** Raised when a dataset claim is held by a different package. */
export class DatasetClaimConflictError extends FleetError {}
