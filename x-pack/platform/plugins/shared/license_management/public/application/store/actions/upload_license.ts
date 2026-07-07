/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import type { Dispatch } from 'redux';
import { addLicense } from './add_license';
import { putLicense, type PutLicenseResponse } from '../../lib/es';
import { addUploadErrorMessage } from './add_error_message';
import type { UploadStatusState, AppThunkAction, ThunkServices } from '../types';

const extractErrorReason = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('responseJSON' in err)) {
    return undefined;
  }
  const { responseJSON } = err;
  if (typeof responseJSON !== 'object' || responseJSON === null || !('error' in responseJSON)) {
    return undefined;
  }
  const { error } = responseJSON;
  if (typeof error !== 'object' || error === null || !('reason' in error)) {
    return undefined;
  }
  const { reason } = error;
  return typeof reason === 'string' ? reason : undefined;
};

const isNonNullObject = (value: unknown): value is object => {
  return typeof value === 'object' && value !== null;
};

const hasOwn = <K extends PropertyKey>(value: object, key: K): value is Record<K, unknown> => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const parseLicenseType = (licenseString: string): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(licenseString);

    if (!isNonNullObject(parsed) || !hasOwn(parsed, 'license')) {
      return undefined;
    }
    const license = parsed.license;

    if (!isNonNullObject(license) || !hasOwn(license, 'type')) {
      return undefined;
    }

    return typeof license.type === 'string' && license.type.length > 0 ? license.type : undefined;
  } catch {
    return undefined;
  }
};

export const uploadLicenseStatus = createAction<UploadStatusState>(
  'LICENSE_MANAGEMENT_UPLOAD_LICENSE_STATUS'
);

const genericUploadError = i18n.translate(
  'xpack.licenseMgmt.uploadLicense.genericUploadErrorMessage',
  {
    defaultMessage: 'Error encountered uploading license:',
  }
);

const dispatchFromResponse = async (
  response: PutLicenseResponse,
  dispatch: Dispatch,
  currentLicenseType: string,
  newLicenseType: string,
  { history, licensing }: Pick<ThunkServices, 'history' | 'licensing'>
) => {
  const { error, acknowledged, license_status: licenseStatus, acknowledge } = response;
  if (error) {
    dispatch(uploadLicenseStatus({}));
    dispatch(addUploadErrorMessage(`${genericUploadError} ${error.reason}`));
  } else if (acknowledged) {
    if (licenseStatus === 'invalid') {
      dispatch(uploadLicenseStatus({}));
      dispatch(
        addUploadErrorMessage(
          i18n.translate('xpack.licenseMgmt.uploadLicense.invalidLicenseErrorMessage', {
            defaultMessage: 'The supplied license is not valid for this product.',
          })
        )
      );
    } else if (licenseStatus === 'expired') {
      dispatch(uploadLicenseStatus({}));
      dispatch(
        addUploadErrorMessage(
          i18n.translate('xpack.licenseMgmt.uploadLicense.expiredLicenseErrorMessage', {
            defaultMessage: 'The supplied license has expired.',
          })
        )
      );
    } else {
      const updatedLicense = await licensing.refresh();
      dispatch(addLicense(updatedLicense));
      dispatch(uploadLicenseStatus({}));
      history.replace('/home');
      window.location.reload();
    }
  } else {
    const messages = Object.values(acknowledge ?? {}).slice(1);
    const first = i18n.translate(
      'xpack.licenseMgmt.uploadLicense.problemWithUploadedLicenseDescription',
      {
        defaultMessage:
          'Some functionality will be lost if you replace your {currentLicenseType} license with a {newLicenseType} license. Review the list of features below.',
        values: {
          currentLicenseType: currentLicenseType.toUpperCase(),
          newLicenseType: newLicenseType.toUpperCase(),
        },
      }
    );
    dispatch(uploadLicenseStatus({ acknowledge: true, messages: [first, ...messages] }));
  }
};

export const uploadLicense =
  (
    licenseString: string,
    currentLicenseType: string,
    acknowledge?: boolean
  ): AppThunkAction<Promise<void>> =>
  async (dispatch, _getState, services) => {
    dispatch(uploadLicenseStatus({ applying: true }));
    const newLicenseType = parseLicenseType(licenseString);
    if (newLicenseType === undefined) {
      dispatch(uploadLicenseStatus({}));
      dispatch(
        addUploadErrorMessage(
          i18n.translate('xpack.licenseMgmt.uploadLicense.checkLicenseFileErrorMessage', {
            defaultMessage: '{genericUploadError} Check your license file.',
            values: {
              genericUploadError,
            },
          })
        )
      );
      return;
    }
    try {
      const response = await putLicense(services.http, licenseString, acknowledge ?? false);
      await dispatchFromResponse(response, dispatch, currentLicenseType, newLicenseType, services);
    } catch (err: unknown) {
      const reason = extractErrorReason(err);
      const message =
        reason ??
        i18n.translate('xpack.licenseMgmt.uploadLicense.unknownErrorErrorMessage', {
          defaultMessage: 'Unknown error.',
        });
      dispatch(uploadLicenseStatus({}));
      dispatch(addUploadErrorMessage(`${genericUploadError} ${message}`));
    }
  };
