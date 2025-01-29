/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { presentation } from './presentation';
import { report } from './report';

// Registry expects a function that returns a spec object
export const tagSpecs = [presentation, report];
