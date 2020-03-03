/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { addLicense } from './add_license';
import { putLicense } from '../../lib/es';
import { addUploadErrorMessage } from './add_error_message';
import { i18n } from '@kbn/i18n';

export const uploadLicenseStatus = createAction('LICENSE_MANAGEMENT_UPLOAD_LICENSE_STATUS');

const genericUploadError = i18n.translate(
  'xpack.licenseMgmt.uploadLicense.genericUploadErrorMessage',
  {
    defaultMessage: 'Error encountered uploading license:',
  }
);

const dispatchFromResponse = async (
  response,
  dispatch,
  currentLicenseType,
  newLicenseType,
  { history, legacy: { xPackInfo, refreshXpack } }
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
      await refreshXpack();
      dispatch(addLicense(xPackInfo.get('license')));
      dispatch(uploadLicenseStatus({}));
      history.replace('/home');
      // reload necessary to get left nav to refresh with proper links
      window.location.reload();
    }
  } else {
    // first message relates to command line interface, so remove it
    const messages = Object.values(acknowledge).slice(1);
    // messages can be in nested arrays
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

export const uploadLicense = (licenseString, currentLicenseType, acknowledge) => async (
  dispatch,
  getState,
  services
) => {
  dispatch(uploadLicenseStatus({ applying: true }));
  let newLicenseType = null;
  try {
    ({ type: newLicenseType } = JSON.parse(licenseString).license);
  } catch (err) {
    dispatch(uploadLicenseStatus({}));
    return dispatch(
      addUploadErrorMessage(
        i18n.translate('xpack.licenseMgmt.uploadLicense.checkLicenseFileErrorMessage', {
          defaultMessage: '{genericUploadError} Check your license file.',
          values: {
            genericUploadError,
          },
        })
      )
    );
  }
  try {
    const response = await putLicense(services.http, licenseString, acknowledge);
    await dispatchFromResponse(response, dispatch, currentLicenseType, newLicenseType, services);
  } catch (err) {
    const message =
      err.responseJSON && err.responseJSON.error.reason
        ? err.responseJSON.error.reason
        : i18n.translate('xpack.licenseMgmt.uploadLicense.unknownErrorErrorMessage', {
            defaultMessage: 'Unknown error.',
          });
    dispatch(uploadLicenseStatus({}));
    dispatch(addUploadErrorMessage(`${genericUploadError} ${message}`));
  }
};
