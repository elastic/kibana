/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { Subject } from 'rxjs';

export const ALLOW_CELL_RANGE_SELECTION = true;

export const dragSelect$ = new Subject();
export const explorer$ = new Subject();
