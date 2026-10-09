/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DisplayFields, Identifier } from './common';

export interface Pipeline extends DisplayFields {
  id: Identifier;
  definition: Identifier;
  to: Identifier;
}
