/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING } from '../../../../../server/lib/constants';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY, KIBANA_SETTINGS_TYPE } from '../../../common/constants';

let loggedDeprecationWarning = false;

export function resetDeprecationWarning() {
  loggedDeprecationWarning = false;
}

/*
 * Check if Cluster Alert email notifications is enabled in config
 * If so, use uiSettings API to fetch the X-Pack default admin email
 */
export async function getDefaultAdminEmail(config, callCluster, log) {
  if (!config.get('xpack.monitoring.cluster_alerts.email_notifications.enabled')) {
    return null;
  }

  const emailAddressConfigKey = `xpack.monitoring.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}`;
  const configuredEmailAddress = config.get(emailAddressConfigKey);

  if (configuredEmailAddress) {
    return configuredEmailAddress;
  }

  // DEPRECATED (Remove below in 7.0): If an email address is not configured in kibana.yml, then fallback to xpack:defaultAdminEmail

  const index = config.get('kibana.index');
  const version = config.get('pkg.version');
  const uiSettingsDoc = await callCluster('get', {
    index,
    id: `config:${version}`,
    ignore: [400, 404], // 400 if the index is closed, 404 if it does not exist
  });

  const emailAddress = get(
    uiSettingsDoc,
    ['_source', 'config', XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING],
    null
  );

  if (emailAddress && !loggedDeprecationWarning) {
    const message =
      `Monitoring is using ${XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING} for cluster alert notifications, ` +
      `which will not be supported in Kibana 7.0. Please configure ${emailAddressConfigKey} in your kibana.yml settings`;

    log.warn(message);
    loggedDeprecationWarning = true;
  }

  return emailAddress;
}

// we use shouldUseNull to determine if we need to send nulls; we only send nulls if the last email wasn't null
let shouldUseNull = true;

export async function checkForEmailValue(
  config,
  callCluster,
  log,
  _shouldUseNull = shouldUseNull,
  _getDefaultAdminEmail = getDefaultAdminEmail
) {
  const defaultAdminEmail = await _getDefaultAdminEmail(config, callCluster, log);

  // Allow null so clearing the advanced setting will be reflected in the data
  const isAcceptableNull = defaultAdminEmail === null && _shouldUseNull;

  /* NOTE we have no real validation checking here. If the user enters a bad
   * string for email, their email server will alert the admin the fact what
   * went wrong and they'll have to track it back to cluster alerts email
   * notifications on their own. */

  if (isAcceptableNull || defaultAdminEmail !== null) {
    return defaultAdminEmail;
  }
}

export function getSettingsCollector({ config, collectorSet }) {
  return collectorSet.makeStatsCollector({
    type: KIBANA_SETTINGS_TYPE,
    isReady: () => true,
    async fetch(callCluster) {
      let kibanaSettingsData;
      const defaultAdminEmail = await checkForEmailValue(config, callCluster, this.log);

      // skip everything if defaultAdminEmail === undefined
      if (defaultAdminEmail || (defaultAdminEmail === null && shouldUseNull)) {
        kibanaSettingsData = this.getEmailValueStructure(defaultAdminEmail);
        this.log.debug(
          `[${defaultAdminEmail}] default admin email setting found, sending [${KIBANA_SETTINGS_TYPE}] monitoring document.`
        );
      } else {
        this.log.debug(
          `not sending [${KIBANA_SETTINGS_TYPE}] monitoring document because [${defaultAdminEmail}] is null or invalid.`
        );
      }

      // remember the current email so that we can mark it as successful if the bulk does not error out
      shouldUseNull = !!defaultAdminEmail;

      // returns undefined if there was no result
      return kibanaSettingsData;
    },
    getEmailValueStructure(email) {
      return {
        xpack: {
          default_admin_email: email,
        },
      };
    },
  });
}
