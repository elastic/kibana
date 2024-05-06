/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// supported values for `service` in addition to nodemailer's list of well-known services
export enum AdditionalEmailServices {
  ELASTIC_CLOUD = 'elastic_cloud',
  EXCHANGE = 'exchange_server',
  OTHER = 'other',
}

export const INTERNAL_BASE_STACK_CONNECTORS_API_PATH = '/internal/stack_connectors';

export { OpsgenieSubActions, OpsgenieConnectorTypeId } from './opsgenie';
