/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions as commonFunctions } from '../common';
import { location } from './location';
import { markdown } from './markdown';
import { urlparam } from './urlparam';
import { AnyExpressionFunctionDefinition } from '../../../types';

export const functions: Array<() => AnyExpressionFunctionDefinition> = [
  location,
  markdown,
  urlparam,
  ...commonFunctions,
];
