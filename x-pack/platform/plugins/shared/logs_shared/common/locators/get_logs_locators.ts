/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type UrlService } from '@kbn/share-plugin/common/url_service';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from './logs_locator';

export function getLogsLocatorFromUrlService(urlService: UrlService) {
  return urlService.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
}
