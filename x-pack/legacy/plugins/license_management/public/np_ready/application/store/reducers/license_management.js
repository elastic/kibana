/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { license } from './license';
import { uploadStatus } from './upload_status';
import { startBasicStatus } from './start_basic_license_status';
import { uploadErrorMessage } from './upload_error_message';
import { trialStatus } from './trial_status';
import { permissions } from './permissions';
import moment from 'moment-timezone';

export const WARNING_THRESHOLD_IN_DAYS = 25;

export const licenseManagement = combineReducers({
  license,
  uploadStatus,
  uploadErrorMessage,
  trialStatus,
  startBasicStatus,
  permissions,
});

export const getPermission = state => {
  return state.permissions.hasPermission;
};

export const isPermissionsLoading = state => {
  return state.permissions.loading;
};

export const getPermissionsError = state => {
  return state.permissions.error;
};

export const getLicense = state => {
  return state.license;
};

export const getLicenseType = state => {
  return getLicense(state).type;
};

export const getExpirationMillis = state => {
  return getLicense(state).expiryDateInMillis;
};

export const getExpirationDate = state => {
  //basic licenses do not expire
  if (getLicenseType(state) === 'basic') {
    return null;
  }
  const expirationMillis = getExpirationMillis(state);
  if (expirationMillis) {
    return moment.tz(getExpirationMillis(state), moment.tz.guess());
  } else {
    return null;
  }
};

export const getExpirationDateFormatted = state => {
  const expirationDate = getExpirationDate(state);
  return expirationDate ? expirationDate.format('LLL z') : null;
};

export const isExpired = state => {
  return new Date().getTime() > getExpirationMillis(state);
};

export const isImminentExpiration = state => {
  const now = new Date();
  const expirationDate = getExpirationDate(state);
  return (
    expirationDate &&
    expirationDate.isAfter(now) &&
    expirationDate.diff(now, 'days') <= WARNING_THRESHOLD_IN_DAYS
  );
};

export const shouldShowRevertToBasicLicense = state => {
  const { type } = getLicense(state);
  return type === 'trial' || isImminentExpiration(state) || isExpired(state);
};

export const uploadNeedsAcknowledgement = state => {
  return !!state.uploadStatus.acknowledge;
};

export const isApplying = state => {
  return !!state.uploadStatus.applying;
};

export const uploadMessages = state => {
  return state.uploadStatus.messages;
};

export const isInvalid = state => {
  return !!state.uploadStatus.invalid;
};

export const getUploadErrorMessage = state => {
  return state.uploadErrorMessage;
};

export const shouldShowStartTrial = state => {
  const licenseType = getLicenseType(state);
  return (
    state.trialStatus.canStartTrial &&
    licenseType !== 'trial' &&
    //don't show for platinum & enterprise unless it is expired
    ((licenseType !== 'platinum' && licenseType !== 'enterprise') || isExpired(state))
  );
};

export const shouldShowRequestTrialExtension = state => {
  if (state.trialStatus.canStartTrial) {
    return false;
  }
  const { type } = getLicense(state);
  return (type !== 'platinum' && type !== 'enterprise') || isExpired(state);
};

export const startTrialError = state => {
  return state.trialStatus.startTrialError;
};

export const startBasicLicenseNeedsAcknowledgement = state => {
  return !!state.startBasicStatus.acknowledge;
};

export const getStartBasicMessages = state => {
  return state.startBasicStatus.messages;
};
