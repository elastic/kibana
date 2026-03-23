/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWatch } from '../../../__fixtures__';

export const WATCH_ID = 'my-test-watch';

export const WATCH: { watch: ReturnType<typeof getWatch> } = { watch: getWatch({ id: WATCH_ID }) };
