/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import { LocatorPublic } from '@kbn/share-plugin/common';

export interface DataQualityLocatorDependencies {
  useHash: boolean;
  managementLocator: LocatorPublic<ManagementAppLocatorParams>;
}
