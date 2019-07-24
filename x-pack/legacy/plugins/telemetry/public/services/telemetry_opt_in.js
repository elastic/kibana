/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { setCanTrackUiMetrics } from 'ui/ui_metric';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

export function TelemetryOptInProvider($injector, chrome) {
  let currentOptInStatus = $injector.get('telemetryOptedIn');
  setCanTrackUiMetrics(currentOptInStatus);

  const provider = {
    getOptIn: () => currentOptInStatus,
    setOptIn: async (enabled) => {
      setCanTrackUiMetrics(enabled);

      const $http = $injector.get('$http');

      try {
        await $http.post(chrome.addBasePath('/api/telemetry/v2/optIn'), { enabled });
        currentOptInStatus = enabled;
      } catch (error) {
        toastNotifications.addError(error, {
          title: i18n.translate('xpack.telemetry.optInErrorToastTitle', {
            defaultMessage: 'Error',
          }),
          toastMessage: i18n.translate('xpack.telemetry.optInErrorToastText', {
            defaultMessage: 'An error occured while trying to set the usage statistics preference.',
          }),
        });
        return false;
      }

      return true;
    },
    fetchExample: async () => {
      const $http = $injector.get('$http');
      return $http.post(chrome.addBasePath(`/api/telemetry/v2/clusters/_stats`), {
        unencrypted: true,
        timeRange: {
          min: moment().subtract(20, 'minutes').toISOString(),
          max: moment().toISOString()
        }
      });
    }
  };

  return provider;
}
