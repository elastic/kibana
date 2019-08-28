/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fade } from './fade';
import { rotate } from './rotate';
import { slide } from './slide';
import { zoom } from './zoom';

export const transitions = [fade, rotate, slide, zoom];
