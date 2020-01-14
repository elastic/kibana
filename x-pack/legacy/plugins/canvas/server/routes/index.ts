/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shareableWorkpads } from './shareables';
import { CoreSetup } from '../shim';

export function routes(setup: CoreSetup): void {
  shareableWorkpads(setup.http.route);
}
