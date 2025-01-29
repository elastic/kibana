/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  id: 'painlessLab',
  minimumLicenseType: basicLicense,
};

export const API_BASE_PATH = '/api/painless_lab';
