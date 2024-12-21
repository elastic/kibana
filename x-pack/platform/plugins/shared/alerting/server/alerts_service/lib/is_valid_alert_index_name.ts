/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VALID_ALERT_INDEX_PREFIXES } from '../resource_installer_utils';

export const isValidAlertIndexName = (indexName: string): boolean => {
  return VALID_ALERT_INDEX_PREFIXES.some((prefix: string) => indexName.startsWith(prefix));
};
