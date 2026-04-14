/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from 'redux-actions';
import { startBasic } from '../../lib/es';
import type { StartBasicStatusState, AppThunkAction } from '../types';

export const startBasicLicenseStatus = createAction<StartBasicStatusState>(
  'LICENSE_MANAGEMENT_START_BASIC_LICENSE_STATUS'
);

export const cancelStartBasicLicense = createAction(
  'LICENSE_MANAGEMENT_CANCEL_START_BASIC_LICENSE'
);

export const startBasicLicense =
  (currentLicenseType: string, ack?: boolean): AppThunkAction<Promise<void>> =>
  async (dispatch, getState, { licensing, toasts, http }) => {
    const { acknowledged, basic_was_started, error_message, acknowledge } = await startBasic(
      http,
      ack ?? false
    );
    if (acknowledged) {
      if (basic_was_started) {
        await licensing.refresh();
        window.location.reload();
      } else {
        toasts.addDanger(error_message);
      }
    } else {
      const messages = Object.values(acknowledge)
        .slice(1)
        .reduce<string[]>((acc, item) => {
          item.forEach((message) => {
            acc.push(message);
          });
          return acc;
        }, []);
      const first = i18n.translate(
        'xpack.licenseMgmt.replacingCurrentLicenseWithBasicLicenseWarningMessage',
        {
          defaultMessage:
            'Some functionality will be lost if you replace your {currentLicenseType} license with a BASIC license. Review the list of features below.',
          values: {
            currentLicenseType: currentLicenseType.toUpperCase(),
          },
        }
      );
      dispatch(startBasicLicenseStatus({ acknowledge: true, messages: [first, ...messages] }));
    }
  };
