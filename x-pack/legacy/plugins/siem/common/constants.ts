/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const APP_ID = 'siem';
export const APP_NAME = 'SIEM';
export const DEFAULT_BYTES_FORMAT = 'format:bytes:defaultPattern';
export const DEFAULT_DATE_FORMAT = 'dateFormat';
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz';
export const DEFAULT_DARK_MODE = 'theme:darkMode';
export const DEFAULT_INDEX_KEY = 'siem:defaultIndex';
export const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';
export const DEFAULT_TIME_RANGE = 'timepicker:timeDefaults';
export const DEFAULT_REFRESH_RATE_INTERVAL = 'timepicker:refreshIntervalDefaults';
export const DEFAULT_SIEM_TIME_RANGE = 'siem:timeDefaults';
export const DEFAULT_SIEM_REFRESH_INTERVAL = 'siem:refreshIntervalDefaults';
export const DEFAULT_SIGNALS_INDEX = '.siem-signals';
export const DEFAULT_MAX_SIGNALS = 100;
export const DEFAULT_SEARCH_AFTER_PAGE_SIZE = 100;
export const DEFAULT_ANOMALY_SCORE = 'siem:defaultAnomalyScore';
export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000;
export const DEFAULT_SCALE_DATE_FORMAT = 'dateFormat:scaled';
export const DEFAULT_FROM = 'now-24h';
export const DEFAULT_TO = 'now';
export const DEFAULT_INTERVAL_PAUSE = true;
export const DEFAULT_INTERVAL_TYPE = 'manual';
export const DEFAULT_INTERVAL_VALUE = 300000; // ms
export const DEFAULT_TIMEPICKER_QUICK_RANGES = 'timepicker:quickRanges';

/** This Kibana Advanced Setting enables the `Security news` feed widget */
export const ENABLE_NEWS_FEED_SETTING = 'siem:enableNewsFeed';

/** This Kibana Advanced Setting specifies the URL of the News feed widget */
export const NEWS_FEED_URL_SETTING = 'siem:newsFeedUrl';

/** The default value for News feed widget */
export const NEWS_FEED_URL_SETTING_DEFAULT = 'https://feeds.elastic.co/security-solution';

/**
 * Id for the signals alerting type
 */
export const SIGNALS_ID = `${APP_ID}.signals`;

/**
 * Special internal structure for tags for signals. This is used
 * to filter out tags that have internal structures within them.
 */
export const INTERNAL_IDENTIFIER = '__internal';
export const INTERNAL_RULE_ID_KEY = `${INTERNAL_IDENTIFIER}_rule_id`;
export const INTERNAL_IMMUTABLE_KEY = `${INTERNAL_IDENTIFIER}_immutable`;

/**
 * Detection engine routes
 */
export const DETECTION_ENGINE_URL = '/api/detection_engine';
export const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules`;
export const DETECTION_ENGINE_PREPACKAGED_URL = `${DETECTION_ENGINE_RULES_URL}/prepackaged`;
export const DETECTION_ENGINE_PRIVILEGES_URL = `${DETECTION_ENGINE_URL}/privileges`;
export const DETECTION_ENGINE_INDEX_URL = `${DETECTION_ENGINE_URL}/index`;
export const DETECTION_ENGINE_TAGS_URL = `${DETECTION_ENGINE_URL}/tags`;
export const DETECTION_ENGINE_RULES_STATUS_URL = `${DETECTION_ENGINE_RULES_URL}/_find_statuses`;
export const DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL = `${DETECTION_ENGINE_RULES_URL}/prepackaged/_status`;

/**
 * Default signals index key for kibana.dev.yml
 */
export const SIGNALS_INDEX_KEY = 'signalsIndex';
export const DETECTION_ENGINE_SIGNALS_URL = `${DETECTION_ENGINE_URL}/signals`;
export const DETECTION_ENGINE_SIGNALS_STATUS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/status`;
export const DETECTION_ENGINE_QUERY_SIGNALS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/search`;

/**
 * Common naming convention for an unauthenticated user
 */
export const UNAUTHENTICATED_USER = 'Unauthenticated';
