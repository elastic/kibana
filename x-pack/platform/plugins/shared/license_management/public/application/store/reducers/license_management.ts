/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { createSelector } from 'reselect';

import moment from 'moment-timezone';
import { license } from './license';
import { uploadStatus } from './upload_status';
import { startBasicStatus } from './start_basic_license_status';
import { uploadErrorMessage } from './upload_error_message';
import { trialStatus } from './trial_status';
import { permissions } from './permissions';
import type { LicenseManagementState } from '../types';

export const WARNING_THRESHOLD_IN_DAYS = 25;

export const licenseManagement = combineReducers({
  license,
  uploadStatus,
  uploadErrorMessage,
  trialStatus,
  startBasicStatus,
  permissions,
});

export const getPermission = (state: LicenseManagementState) => {
  return state.permissions.hasPermission;
};

export const isPermissionsLoading = (state: LicenseManagementState) => {
  return state.permissions.loading;
};

export const getPermissionsError = (state: LicenseManagementState) => {
  return state.permissions.error;
};

export const getLicense = (state: LicenseManagementState) => {
  return state.license;
};

export const getLicenseType = (state: LicenseManagementState) => {
  return getLicense(state)?.type;
};

export const getExpirationMillis = (state: LicenseManagementState) => {
  return getLicense(state)?.expiryDateInMillis;
};

export const getExpirationDate = (state: LicenseManagementState) => {
  if (getLicenseType(state) === 'basic') {
    return null;
  }
  const expirationMillis = getExpirationMillis(state);
  if (expirationMillis) {
    return moment.tz(expirationMillis, moment.tz.guess());
  } else {
    return null;
  }
};

export const getExpirationDateFormatted = (state: LicenseManagementState) => {
  const expirationDate = getExpirationDate(state);
  return expirationDate ? expirationDate.format('LLL z') : null;
};

export const isExpired = (state: LicenseManagementState) => {
  const expirationMillis = getExpirationMillis(state);
  if (expirationMillis === undefined) {
    return false;
  }
  return new Date().getTime() > expirationMillis;
};

export const isImminentExpiration = (state: LicenseManagementState) => {
  const now = new Date();
  const expirationDate = getExpirationDate(state);
  return (
    expirationDate &&
    expirationDate.isAfter(now) &&
    expirationDate.diff(now, 'days') <= WARNING_THRESHOLD_IN_DAYS
  );
};

export const shouldShowRevertToBasicLicense = (state: LicenseManagementState) => {
  const type = getLicenseType(state);
  return type === 'trial' || isImminentExpiration(state) || isExpired(state);
};

export const uploadNeedsAcknowledgement = (state: LicenseManagementState) => {
  return !!state.uploadStatus.acknowledge;
};

export const isApplying = (state: LicenseManagementState) => {
  return !!state.uploadStatus.applying;
};

export const uploadMessages = (state: LicenseManagementState) => {
  return state.uploadStatus.messages;
};

export const isInvalid = (state: LicenseManagementState) => {
  return !!state.uploadStatus.invalid;
};

export const getUploadErrorMessage = (state: LicenseManagementState) => {
  return state.uploadErrorMessage;
};

export const shouldShowStartTrial = (state: LicenseManagementState) => {
  const licenseType = getLicenseType(state);
  const canStartTrial = state.trialStatus.canStartTrial === true;
  return (
    canStartTrial &&
    licenseType !== 'trial' &&
    ((licenseType !== 'platinum' && licenseType !== 'enterprise') || isExpired(state))
  );
};

export const shouldShowRequestTrialExtension = (state: LicenseManagementState) => {
  if (state.trialStatus.canStartTrial) {
    return false;
  }
  const type = getLicenseType(state);
  if (!type) {
    return false;
  }
  return (type !== 'platinum' && type !== 'enterprise') || isExpired(state);
};

export const startTrialError = (state: LicenseManagementState) => {
  return state.trialStatus.startTrialError;
};

export const startBasicLicenseNeedsAcknowledgement = (state: LicenseManagementState) => {
  return !!state.startBasicStatus.acknowledge;
};

export const getStartBasicMessages = (state: LicenseManagementState) => {
  return state.startBasicStatus.messages;
};

export const getLicenseState = createSelector(
  getLicense,
  getExpirationDateFormatted,
  isExpired,
  (licenseData, expirationDate, expired) => {
    const isActive = licenseData?.isActive ?? false;
    const type = licenseData?.type;

    return {
      type: capitalize(type),
      isExpired: expired,
      expirationDate,
      status: isActive
        ? i18n.translate(
            'xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusText',
            {
              defaultMessage: 'active',
            }
          )
        : i18n.translate(
            'xpack.licenseMgmt.licenseDashboard.licenseStatus.inactiveLicenseStatusText',
            {
              defaultMessage: 'inactive',
            }
          ),
    };
  }
);
