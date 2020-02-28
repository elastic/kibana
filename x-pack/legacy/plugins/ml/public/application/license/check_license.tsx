/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { ILicense } from '../../../../../../plugins/licensing/public';
import { getOverlays, getLicensing } from '../util/dependency_cache';
import { VALID_FULL_LICENSE_MODES } from '../../../common/constants/license';

let expiredLicenseBannerId: string;
let license: ILicense | null = null;

export function setLicenseCache(newLicense: ILicense) {
  license = newLicense;
}

export async function checkFullLicense() {
  if (license === null) {
    // just in case the license hasn't been loaded
    await loadLicense();
  }

  if (license === null || license.type === undefined || license.isAvailable === false) {
    // ML is not enabled
    return redirectToKibana();
  } else if (license.type === 'basic') {
    // ML is enabled, but only with a basic or gold license
    return redirectToBasic();
  } else {
    // ML is enabled
    if (hasLicenseExpired()) {
      showExpiredLicenseWarning();
    }
    return license;
  }
}

export async function checkBasicLicense() {
  if (license === null) {
    // just in case the license hasn't been loaded
    await loadLicense();
  }

  if (license === null || license.type === undefined || license.isAvailable === false) {
    // ML is not enabled
    return redirectToKibana();
  } else {
    // ML is enabled
    if (hasLicenseExpired()) {
      showExpiredLicenseWarning();
    }
    return license;
  }
}

async function loadLicense() {
  const { refresh } = getLicensing();
  license = await refresh();
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

export function isFullLicense() {
  return (
    license !== null &&
    license.type !== undefined &&
    VALID_FULL_LICENSE_MODES.includes(license.type)
  );
}
