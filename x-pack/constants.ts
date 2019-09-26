/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export const buildDir = resolve(__dirname, 'build');
export const buildTarget = resolve(buildDir, 'plugin');
export const packageDir = resolve(buildDir, 'distributions');
export const coverageDir = resolve(__dirname, 'coverage');
