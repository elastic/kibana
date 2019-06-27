/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { Request, ServerRoute } from 'hapi';

// the contract with the registry
export type IntegrationList = IntegrationListItem[];

// registry /list
// https://github.com/elastic/integrations-registry/blob/master/docs/api/list.json
export interface IntegrationListItem {
  description: string;
  download: string;
  icon: string;
  name: string;
  version: string;
}

// registry /package/{name}
// https://github.com/elastic/integrations-registry/blob/master/docs/api/package.json
export interface IntegrationInfo {
  name: string;
  version: string;
  description: string;
  icon: string;
  requirement: {
    kibana: {
      min: string;
      max: string;
    };
  };
}
