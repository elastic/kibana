/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/security-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ConnectorSpecDetail } from '../../common/connector_spec';
import type { ActionTypeRegistry } from '../action_type_registry';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionsAuthorization } from '../authorization/actions_authorization';

export interface SpecsClientOpts {
  actionTypeRegistry: ActionTypeRegistry;
  configurationUtilities: ActionsConfigurationUtilities;
  authorization: PublicMethodsOf<ActionsAuthorization>;
  auditLogger?: AuditLogger;
}

export interface GetSpecParams {
  id: string;
}

export interface ISpecsClient {
  get(params: GetSpecParams): Promise<ConnectorSpecDetail>;
}
