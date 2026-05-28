/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { defineRoute } from '../types';

export interface CloudApmPackagePolicyResponse {
  cloudApmPackagePolicy: PackagePolicy;
}

export const cloudApmPackagePolicyRoute = defineRoute<CloudApmPackagePolicyResponse>()({
  endpoint: 'POST /internal/apm/fleet/cloud_apm_package_policy',
});
