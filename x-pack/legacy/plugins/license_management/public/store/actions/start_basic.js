/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { startBasic } from '../../lib/es';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

export const startBasicLicenseStatus = createAction(
  'LICENSE_MANAGEMENT_START_BASIC_LICENSE_STATUS'
);

export const cancelStartBasicLicense = createAction(
  'LICENSE_MANAGEMENT_CANCEL_START_BASIC_LICENSE'
);

export const startBasicLicense = (currentLicenseType, ack) => async (
  dispatch,
  getState,
  { xPackInfo, $injector }
) => {
  /*eslint camelcase: 0*/
  const { acknowledged, basic_was_started, error_message, acknowledge } = await startBasic(ack);
  if (acknowledged) {
    if (basic_was_started) {
      await xPackInfo.refresh($injector);
      // reload necessary to get left nav to refresh with proper links
      window.location.reload();
    } else {
      return toastNotifications.addDanger(error_message);
    }
  } else {
    //messages coming back in arrays
    const messages = Object.values(acknowledge)
      .slice(1)
      .map(item => {
        return item[0];
      });
    const first = i18n.translate(
      'xpack.licenseMgmt.replacingCurrentLicenseWithBasicLicenseWarningMessage',
      {
        //eslint-disable-next-line
      defaultMessage: 'Some functionality will be lost if you replace your {currentLicenseType} license with a BASIC license. Review the list of features below.',
        values: {
          currentLicenseType: currentLicenseType.toUpperCase(),
        },
      }
    );
    dispatch(startBasicLicenseStatus({ acknowledge: true, messages: [first, ...messages] }));
  }
};
