/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ServiceNowConfig {
  apiUrl: string;
  casesConfiguration: {
    closure: string;
  };
}

interface ServiceNowSecrets {
  username: string;
  password: string;
}

export interface ServiceNowActionConnector {
  config: ServiceNowConfig;
  secrets: ServiceNowSecrets;
}

export interface Connector {
  actionTypeId: string;
  logo: string;
}
