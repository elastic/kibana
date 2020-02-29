/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { LicensingPluginSetup } from '../../../../../../plugins/licensing/public';
import { getOverlays } from '../util/dependency_cache';
import { MlLicense } from '../../../common/license';

let expiredLicenseBannerId: string;
let mlLicense: MlLicense | null = null;

export function setLicenseCache(licensingSetup: LicensingPluginSetup) {
  mlLicense = new MlLicense();
  mlLicense.setup(licensingSetup.license$);
  return mlLicense;
}

export async function checkFullLicense() {
  if (mlLicense === null) {
    // this should never happen
    console.error('Licensing not initialized'); // eslint-disable-line
    return redirectToKibana();
  }

  if (mlLicense.isMlEnabled() === false || mlLicense.isReducedLicense() === false) {
    // ML is not enabled or the license isn't at least basic
    return redirectToKibana();
  }

  if (mlLicense.isFullLicense() === false) {
    // ML is enabled, but only with a basic or gold license
    return redirectToBasic();
  }

  // ML is enabled
  if (mlLicense.hasLicenseExpired()) {
    showExpiredLicenseWarning();
  }
}

export async function checkBasicLicense() {
  if (mlLicense === null) {
    // this should never happen
    console.error('Licensing not initialized'); // eslint-disable-line
    return redirectToKibana();
  }

  if (mlLicense.isMlEnabled() === false || mlLicense.isReducedLicense() === false) {
    // ML is not enabled or the license isn't at least basic
    return redirectToKibana();
  }

  // ML is enabled
  if (mlLicense.hasLicenseExpired()) {
    showExpiredLicenseWarning();
  }
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

export function hasLicenseExpired() {
  return mlLicense !== null && mlLicense.hasLicenseExpired();
}

export function isFullLicense() {
  return mlLicense !== null && mlLicense.isFullLicense();
}

function redirectToKibana() {
  window.location.href = '/';
  return Promise.reject();
}

function redirectToBasic() {
  window.location.href = '#/datavisualizer';
  return Promise.reject();
}
