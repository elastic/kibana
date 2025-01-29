/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/d3security/constants';
import {
  D3SecurityConfig,
  D3SecuritySecrets,
  D3SecurityRunActionParams,
} from '../../../common/d3security/types';

export interface D3SecurityActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: D3SecurityRunActionParams;
}

export type D3SecurityConnector = ConnectorTypeModel<
  D3SecurityConfig,
  D3SecuritySecrets,
  D3SecurityActionParams
>;
