/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from './common/constants';

/**
 * Re-writes deprecated user-defined config settings and logs warnings as a
 * result of any rewrite operations.
 *
 * Important: Do not remove any deprecation warning until at least the next
 * major version!
 * @return {Array} array of rename operations and callback function for rename logging
 */
export const deprecations = () => {
  return [
    (settings, log) => {
      const clusterAlertsEnabled = get(settings, 'cluster_alerts.enabled');
      const emailNotificationsEnabled =
        clusterAlertsEnabled && get(settings, 'cluster_alerts.email_notifications.enabled');
      if (emailNotificationsEnabled && !get(settings, CLUSTER_ALERTS_ADDRESS_CONFIG_KEY)) {
        log(
          `Config key "${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}" will be required for email notifications to work in 7.0."`
        );
      }
    },
    (settings, log) => {
      const fromPath = 'xpack.monitoring.elasticsearch';
      const es = get(settings, 'elasticsearch');
      if (es) {
        if (es.username === 'elastic') {
          log(
            `Setting [${fromPath}.username] to "elastic" is deprecated. You should use the "kibana" user instead.`
          );
        }
      }
    },
    (settings, log) => {
      const fromPath = 'xpack.monitoring.elasticsearch.ssl';
      const ssl = get(settings, 'elasticsearch.ssl');
      if (ssl) {
        if (ssl.key !== undefined && ssl.certificate === undefined) {
          log(
            `Setting [${fromPath}.key] without [${fromPath}.certificate] is deprecated. This has no effect, you should use both settings to enable TLS client authentication to Elasticsearch.`
          );
        } else if (ssl.certificate !== undefined && ssl.key === undefined) {
          log(
            `Setting [${fromPath}.certificate] without [${fromPath}.key] is deprecated. This has no effect, you should use both settings to enable TLS client authentication to Elasticsearch.`
          );
        }
      }
    },
  ];
};
