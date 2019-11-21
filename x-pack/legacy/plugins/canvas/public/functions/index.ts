/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asset } from './asset';
import { filters } from './filters';
import { timelion } from './timelion';
import { to } from './to';

export const clientFunctions = [asset, filters, timelion, to];
