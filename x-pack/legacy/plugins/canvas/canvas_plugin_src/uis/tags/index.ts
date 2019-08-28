/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chart } from './chart';
import { filter } from './filter';
import { graphic } from './graphic';
import { presentation } from './presentation';
import { proportion } from './proportion';
import { report } from './report';
import { text } from './text';

// Registry expects a function that returns a spec object
export const tagSpecs = [chart, filter, graphic, presentation, proportion, report, text];
