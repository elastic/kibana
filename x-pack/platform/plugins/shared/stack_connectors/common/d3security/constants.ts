/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const D3_SECURITY_TITLE = i18n.translate(
  'xpack.stackConnectors.components.d3Security.connectorTypeTitle',
  {
    defaultMessage: 'D3 Security',
  }
);
export const D3_SECURITY_CONNECTOR_ID = '.d3security';
export enum SUB_ACTION {
  RUN = 'run',
  TEST = 'test',
}
export enum D3SecuritySeverity {
  EMPTY = '',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}
