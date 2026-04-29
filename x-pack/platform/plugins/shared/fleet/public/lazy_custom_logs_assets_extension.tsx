/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import type { PackageAssetsComponent } from './types';
import { CustomLogsAssetsExtension } from './custom_logs_assets_extension';

export const LazyCustomLogsAssetsExtension = lazy<PackageAssetsComponent>(async () => {
  return {
    default: CustomLogsAssetsExtension,
  };
});
