/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

/*
 * config options opt into telemetry
 * @type {string}
 */
export const CONFIG_TELEMETRY = 'telemetry:optIn';
/*
 * config description for opting into telemetry
 * @type {string}
 */
export const getConfigTelemetryDesc = () => {
  return i18n.translate('xpack.telemetry.telemetryConfigDescription', {
    defaultMessage:
      'Help us improve the Elastic Stack by providing usage statistics for basic features. We will not share this data outside of Elastic.',
  });
};

/**
 * The name of the Kibana System ID used to publish and look up Kibana stats through the Monitoring system.
 * @type {string}
 */
export const KIBANA_SYSTEM_ID = 'kibana';

/**
 * The name of the Beats System ID used to publish and look up Beats stats through the Monitoring system.
 * @type {string}
 */
export const BEATS_SYSTEM_ID = 'beats';

/**
 * The name of the Apm System ID used to publish and look up Apm stats through the Monitoring system.
 * @type {string}
 */
export const APM_SYSTEM_ID = 'beats';

/**
 * The name of the Kibana System ID used to look up Logstash stats through the Monitoring system.
 * @type {string}
 */
export const LOGSTASH_SYSTEM_ID = 'logstash';

/**
 * The name of the Kibana System ID used to look up Reporting stats through the Monitoring system.
 * @type {string}
 */
export const REPORTING_SYSTEM_ID = 'reporting';

/**
 * The amount of time, in milliseconds, to wait between reports when enabled.
 *
 * Currently 24 hours.
 * @type {Number}
 */
export const REPORT_INTERVAL_MS = 86400000;

/*
 * Key for the localStorage service
 */
export const LOCALSTORAGE_KEY = 'xpack.data';

/**
 * Link to the Elastic Telemetry privacy statement.
 */
export const PRIVACY_STATEMENT_URL = `https://www.elastic.co/legal/telemetry-privacy-statement`;

/**
 * The type name used within the Monitoring index to publish localization stats.
 * @type {string}
 */
export const KIBANA_LOCALIZATION_STATS_TYPE = 'localization';

/**
 * The header sent by telemetry service when hitting Elasticsearch to identify query source
 * @type {string}
 */
export const TELEMETRY_QUERY_SOURCE = 'TELEMETRY';
