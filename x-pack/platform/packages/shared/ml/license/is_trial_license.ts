/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import { PLUGIN_ID } from '@kbn/ml-common-constants/app';
import { TRIAL_LICENSE } from './constants';

export function isTrialLicense(license: ILicense) {
  return license.check(PLUGIN_ID, TRIAL_LICENSE).state === 'valid';
}
