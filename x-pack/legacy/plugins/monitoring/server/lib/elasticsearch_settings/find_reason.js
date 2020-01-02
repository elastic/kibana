/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/*
 * Return true if the settings property is enabled or is using its default state of enabled
 * Note: this assumes that a 0 corresponds to disabled
 */
const isEnabledOrDefault = property => {
  return property === undefined || (Boolean(property) && property !== 'false');
};

export function findReason(settingsSource, context, isCloudEnabled) {
  const iterateReasons = () => {
    // PluginEnabled: check for `monitoring.enabled: false`
    const monitoringEnabled = get(settingsSource, 'enabled');
    if (!isEnabledOrDefault(monitoringEnabled)) {
      return {
        found: true,
        reason: {
          property: 'xpack.monitoring.enabled', // NOTE: field cannot be called `key` for reasons that are internal to React
          data: String(monitoringEnabled) // data property must always be string, per propTypes
        }
      };
    }

    // CollectionEnabled: check for collection.enabled setting that disables
    const collectionEnabledRaw = get(settingsSource, 'collection.enabled');
    if (collectionEnabledRaw !== undefined) {
      const collectionEnabled = collectionEnabledRaw === 'true';
      if (!collectionEnabled) {
        return {
          found: true,
          reason: {
            property: 'xpack.monitoring.collection.enabled',
            data: String(collectionEnabled)
          }
        };
      }
    }

    // IntervalEnabled: check for interval settings that disable
    const collectionIntervalRaw = get(settingsSource, 'collection.interval');
    if (collectionIntervalRaw !== undefined) {
      const collectionInterval = parseInt(collectionIntervalRaw, 10);
      if (!Boolean(collectionIntervalRaw) || collectionInterval <= 0) { // parseInt on null == NaN
        return {
          found: true,
          reason: {
            property: 'xpack.monitoring.collection.interval',
            data: String(collectionIntervalRaw)
          }
        };
      }
    }

    // check for exporters settings that move data away
    const exportersFromPacked = get(settingsSource, 'exporters');
    if (exportersFromPacked !== undefined && exportersFromPacked !== null) {
      const exporterKeys = Object.keys(exportersFromPacked); // this is why we do not ask for the settings to be flattened
      if (exporterKeys && exporterKeys.length > 0) {
        /*
         * find if all exporters are disabled or if all enabled exporters are remote
         */
        const allEnabled = exporterKeys.filter(key => {
          return isEnabledOrDefault(exportersFromPacked[key].enabled);
        });

        if (allEnabled.length === 0) {
          return {
            found: true,
            reason: {
              property: 'xpack.monitoring.exporters',
              data: 'Exporters are disabled: ' + exporterKeys.join(', ')
            }
          };
        }

        const allEnabledLocal = exporterKeys.filter(key => {
          const exporter = exportersFromPacked[key];
          return exporter.type === 'local' && isEnabledOrDefault(exporter.enabled);
        });

        const allEnabledRemote = exporterKeys.filter(key => {
          const exporter = exportersFromPacked[key];
          return exporter.type !== 'local' && isEnabledOrDefault(exporter.enabled);
        });
        if (allEnabledRemote.length > 0 && allEnabledLocal.length === 0) {
          let ret = {};
          if (isCloudEnabled) {
            ret = {
              found: true,
              reason: {
                property: 'xpack.monitoring.exporters.cloud_enabled',
                data: 'Cloud detected'
              }
            };
          } else {
            ret =  {
              found: true,
              reason: {
                property: 'xpack.monitoring.exporters',
                data: 'Remote exporters indicate a possible misconfiguration: ' + allEnabledRemote.join(', ')
              }
            };
          }
          return ret;
        }
      }
    }

    return { found: false };
  };

  const reason = iterateReasons();
  const { found, reason: foundReason } = reason;
  if (found) {
    return {
      found,
      reason: {
        ...foundReason,
        ...context // merge context and reason for UI formatting
      }
    };
  }

  return reason;
}
