/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THEHIVE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.thehive.connectorTypeTitle',
  {
    defaultMessage: 'TheHive',
  }
);
export const THEHIVE_CONNECTOR_ID = '.thehive';

export enum SUB_ACTION {
  PUSH_TO_SERVICE = 'pushToService',
  CREATE_ALERT = 'createAlert',
}
export enum TheHiveSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}
export enum TheHiveTLP {
  CLEAR = 0,
  GREEN = 1,
  AMBER = 2,
  AMBER_STRICT = 3,
  RED = 4,
}
