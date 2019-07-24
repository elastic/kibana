/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

/**
 * Helper string to add as a tag in every logging call
 */
export const LOGGING_TAG = 'monitoring';
/**
 * Helper string to add as a tag in every logging call related to Kibana monitoring
 */
export const KIBANA_MONITORING_LOGGING_TAG = 'kibana-monitoring';

/**
 * The Monitoring API version is the expected API format that we export and expect to import.
 * @type {string}
 */
export const MONITORING_SYSTEM_API_VERSION = '6';
/**
 * The type name used within the Monitoring index to publish Kibana ops stats.
 * @type {string}
 */
export const KIBANA_STATS_TYPE_MONITORING = 'kibana_stats'; // similar to KIBANA_STATS_TYPE but rolled up into 10s stats from 5s intervals through ops_buffer
/**
 * The type name used within the Monitoring index to publish Kibana stats.
 * @type {string}
 */
export const KIBANA_SETTINGS_TYPE = 'kibana_settings';
/**
 * The type name used within the Monitoring index to publish Kibana usage stats.
 * NOTE: this string shows as-is in the stats API as a field name for the kibana usage stats
 * @type {string}
 */
export const KIBANA_USAGE_TYPE = 'kibana';

/*
 * Key for the localStorage service
 */
export const STORAGE_KEY = 'xpack.monitoring.data';

/**
 * Units for derivative metric values
 */
export const NORMALIZED_DERIVATIVE_UNIT = '1s';

/*
 * Values for column sorting in table options
 * @type {number} 1 or -1
 */
export const EUI_SORT_ASCENDING = 'asc';
export const EUI_SORT_DESCENDING = 'desc';
export const SORT_ASCENDING = 1;
export const SORT_DESCENDING = -1;

/*
 * Chart colors
 * @type {string}
 */
export const CHART_LINE_COLOR = '#d2d2d2';
export const CHART_TEXT_COLOR = '#9c9c9c';

/*
 * Number of cluster alerts to show on overview page
 * @type {number}
 */
export const CLUSTER_ALERTS_SEARCH_SIZE = 3;

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are gte 1 month
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_LONG = 'M [months] d [days]';

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are lt 1 month but gt 1 minute
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_SHORT = ' d [days] h [hrs] m [min]';

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are lt 1 minute
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_TINY = ' s [seconds]';

/*
 * Simple unique values for Timestamp to duration flags. These are used for
 * determining if calculation should be formatted as "time until" (now to
 * timestamp) or "time since" (timestamp to now)
 */
export const CALCULATE_DURATION_SINCE = 'since';
export const CALCULATE_DURATION_UNTIL = 'until';

/**
 * In order to show ML Jobs tab in the Elasticsearch section / tab navigation, license must be supported
 */
export const ML_SUPPORTED_LICENSES = ['trial', 'platinum'];

/**
 * Metadata service URLs for the different cloud services that have constant URLs (e.g., unlike GCP, which is a constant prefix).
 *
 * @type {Object}
 */
export const CLOUD_METADATA_SERVICES = {
  // We explicitly call out the version, 2016-09-02, rather than 'latest' to avoid unexpected changes
  AWS_URL: 'http://169.254.169.254/2016-09-02/dynamic/instance-identity/document',

  // 2017-04-02 is the first GA release of this API
  AZURE_URL: 'http://169.254.169.254/metadata/instance?api-version=2017-04-02',

  // GCP documentation shows both 'metadata.google.internal' (mostly) and '169.254.169.254' (sometimes)
  // To bypass potential DNS changes, the IP was used because it's shared with other cloud services
  GCP_URL_PREFIX: 'http://169.254.169.254/computeMetadata/v1/instance'
};

/**
 * Constants used by Logstash monitoring code
 */
export const LOGSTASH = {
  MAJOR_VER_REQD_FOR_PIPELINES: 6,

  /*
  * Names ES keys on for different Logstash pipeline queues.
  * @type {string}
  */
  QUEUE_TYPES: {
    MEMORY: 'memory',
    PERSISTED: 'persisted'
  }
};

export const DEFAULT_NO_DATA_MESSAGE = i18n.translate('xpack.monitoring.defaultNoDataMessage', {
  defaultMessage: 'There are no records that match your query. Try changing the time range selection.' });
export const DEFAULT_NO_DATA_MESSAGE_WITH_FILTER = i18n.translate('xpack.monitoring.defaultNoDataWithFilterMessage', {
  defaultMessage:
  'There are no records that match your query with the filter [{filter}]. Try changing the filter or the time range selection.',
  values: { filter: '{{FILTER}}' } });

export const TABLE_ACTION_UPDATE_FILTER = 'UPDATE_FILTER';
export const TABLE_ACTION_RESET_PAGING = 'RESET_PAGING';

export const DEBOUNCE_SLOW_MS = 17; // roughly how long it takes to render a frame at 60fps
export const DEBOUNCE_FAST_MS = 10; // roughly how long it takes to render a frame at 100fps

/**
 * Configuration key for setting the email address used for cluster alert notifications.
 */
export const CLUSTER_ALERTS_ADDRESS_CONFIG_KEY = 'cluster_alerts.email_notifications.email_address';

export const STANDALONE_CLUSTER_CLUSTER_UUID = '__standalone_cluster__';

export const INDEX_PATTERN = '.monitoring-*-6-*,.monitoring-*-7-*';
export const INDEX_PATTERN_KIBANA = '.monitoring-kibana-6-*,.monitoring-kibana-7-*';
export const INDEX_PATTERN_LOGSTASH = '.monitoring-logstash-6-*,.monitoring-logstash-7-*';
export const INDEX_PATTERN_BEATS = '.monitoring-beats-6-*,.monitoring-beats-7-*';
export const INDEX_ALERTS = '.monitoring-alerts-6,.monitoring-alerts-7';
export const INDEX_PATTERN_ELASTICSEARCH = '.monitoring-es-6-*,.monitoring-es-7-*';

export const INDEX_PATTERN_FILEBEAT = 'filebeat-*';

// This is the unique token that exists in monitoring indices collected by metricbeat
export const METRICBEAT_INDEX_NAME_UNIQUE_TOKEN = '-mb-';

// We use this for metricbeat migration to identify specific products that we do not have constants for
export const ELASTICSEARCH_CUSTOM_ID = 'elasticsearch';
/**
 * The id of the infra source owned by the monitoring plugin.
 */
export const INFRA_SOURCE_ID = 'internal-stack-monitoring';
