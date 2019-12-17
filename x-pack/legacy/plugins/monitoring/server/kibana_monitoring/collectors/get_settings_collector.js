/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY, KIBANA_SETTINGS_TYPE } from '../../../common/constants';

/*
 * Check if Cluster Alert email notifications is enabled in config
 * If so, get email from kibana.yml
 */
export async function getDefaultAdminEmail(config) {
  if (!config.get('xpack.monitoring.cluster_alerts.email_notifications.enabled')) {
    return null;
  }

  const emailAddressConfigKey = `xpack.monitoring.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}`;
  const configuredEmailAddress = config.get(emailAddressConfigKey);

  return configuredEmailAddress || null;
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

export function getSettingsCollector(usageCollection, config) {
  return usageCollection.makeStatsCollector({
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
