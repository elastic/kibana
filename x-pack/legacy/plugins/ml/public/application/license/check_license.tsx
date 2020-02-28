/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { ILicense, LICENSE_CHECK_STATE } from '../../../../../../plugins/licensing/public';
import { getOverlays } from '../util/dependency_cache';
import { PLUGIN_ID } from '../../../common/constants/app';

let expiredLicenseBannerId: string;
let license: ILicense | null = null;

const MINIMUM_LICENSE = 'basic';
const MINIMUM_FULL_LICENSE = 'platinum';

export function setLicenseCache(newLicense: ILicense) {
  license = newLicense;
}

export async function checkFullLicense() {
  if (license === null || license.type === undefined) {
    // this should never happen
    console.error('Licensing not initialized'); // eslint-disable-line
    return redirectToKibana();
  }

  if (isMlEnabled() === false || isReducedLicense() === false) {
    // ML is not enabled or the license isn't at least basic
    return redirectToKibana();
  }

  if (isFullLicense() === false) {
    // ML is enabled, but only with a basic or gold license
    return redirectToBasic();
  }

  // ML is enabled
  if (hasLicenseExpired()) {
    showExpiredLicenseWarning();
  }
  return license;
}

export async function checkBasicLicense() {
  if (license === null || license.type === undefined) {
    // this should never happen
    console.error('Licensing not initialized'); // eslint-disable-line
    return redirectToKibana();
  }

  if (isMlEnabled() === false || isReducedLicense() === false) {
    // ML is not enabled or the license isn't at least basic
    return redirectToKibana();
  }

  // ML is enabled
  if (hasLicenseExpired()) {
    showExpiredLicenseWarning();
  }
  return license;
}

function showExpiredLicenseWarning() {
  if (expiredLicenseBannerId === undefined) {
    // Only show the banner once with no way to dismiss it
    const overlays = getOverlays();
    expiredLicenseBannerId = overlays.banners.add(
      toMountPoint(<EuiCallOut iconType="iInCircle" color="warning" title={''} />)
    );
  }
}

function redirectToKibana() {
  window.location.href = '/';
  return Promise.reject();
}

function redirectToBasic() {
  window.location.href = '#/datavisualizer';
  return Promise.reject();
}

export function hasLicenseExpired() {
  return license !== null && license.status === 'expired';
}

export function isMlEnabled() {
  return license !== null && license.getFeature(PLUGIN_ID).isEnabled;
}

export function isReducedLicense() {
  return (
    license !== null &&
    license.check(PLUGIN_ID, MINIMUM_LICENSE).state === LICENSE_CHECK_STATE.Valid
  );
}

export function isFullLicense() {
  return (
    license !== null &&
    license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === LICENSE_CHECK_STATE.Valid
  );
}
