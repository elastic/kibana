/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UrlConfig {
  url_name: string;
  url_value: string;
}

export interface KibanaUrlConfig extends UrlConfig {
  time_range: string;
}
