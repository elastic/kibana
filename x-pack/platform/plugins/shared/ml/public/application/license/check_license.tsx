/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlLicense } from '../../../common/license';

let mlLicense: MlLicense | null = null;

/**
 * Cache ml license to support legacy usage.
 */
export function setLicenseCache(mlLicenseInstance: MlLicense) {
  mlLicense = mlLicenseInstance;
  return mlLicense;
}

/**
 * Check to see if the current license has expired
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export function hasLicenseExpired() {
  return mlLicense !== null && mlLicense.hasLicenseExpired();
}

/**
 * Check to see if the current license is trial, platinum or enterprise.
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export function isFullLicense() {
  return mlLicense !== null && mlLicense.isFullLicense();
}

/**
 * Check to see if the current license is trial.
 * Note, this is not accurate for cloud trials.
 * For cloud trials use isCloudTrial returned from the mlInfo endpoint
 *
 * @deprecated
 * @export
 * @returns {boolean}
 */
export function isTrialLicense() {
  return mlLicense !== null && mlLicense.isTrialLicense();
}
