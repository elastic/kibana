/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatdate } from './formatdate';
import { formatnumber } from './formatnumber';
import { rounddate } from './rounddate';
import { sort } from './sort';

export const transformSpecs = [formatdate, formatnumber, rounddate, sort];
