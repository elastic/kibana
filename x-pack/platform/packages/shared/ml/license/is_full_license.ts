/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { PLUGIN_ID } from '@kbn/ml-common-constants/app';
import { MINIMUM_FULL_LICENSE } from './constants';

export function isFullLicense(license: ILicense) {
  return license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === 'valid';
}
