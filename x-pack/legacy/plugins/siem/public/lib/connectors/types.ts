/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-restricted-imports */
/* eslint-disable @kbn/eslint/no-restricted-paths */

import {
  ConfigType,
  SecretsType,
} from '../../../../../../plugins/actions/server/builtin_action_types/servicenow/types';

export interface ServiceNowActionConnector {
  config: ConfigType;
  secrets: SecretsType;
}

export interface Connector {
  actionTypeId: string;
  logo: string;
}
