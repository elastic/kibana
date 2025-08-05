/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const XSOAR_TITLE = i18n.translate(
  'xpack.stackConnectors.components.xsoar.connectorTypeTitle',
  {
    defaultMessage: 'XSOAR',
  }
);
export const XSOAR_CONNECTOR_ID = '.xsoar';
export enum SUB_ACTION {
  PLAYBOOKS = 'getPlaybooks',
  RUN = 'run',
}
export enum XSOARSeverity {
  INFORMATIONAL = 0.5,
  UNKNOWN = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}
