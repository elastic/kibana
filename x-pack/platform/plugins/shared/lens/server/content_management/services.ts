/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementServicesDefinition, Version } from '@kbn/object-versioning';

import { serviceDefinition as v0 } from './v0/service';
import { serviceDefinition as v1 } from './v1/service';
import { serviceDefinition as v2 } from './v2/service';

export const servicesDefinitions: { [version: Version]: ContentManagementServicesDefinition } = {
  0: v0,
  1: v1,
  2: v2,
};
