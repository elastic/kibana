/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../../../../plugins/licensing/server';
import { ElasticsearchPlugin } from '../../../../../../src/legacy/core_plugins/elasticsearch';

export interface Dependencies {
  licensing: LicensingPluginSetup;
  elasticsearch: ElasticsearchPlugin;
}

export interface RouteDependencies {
  router: IRouter;
  plugins: {
    elasticsearch: ElasticsearchPlugin;
    license: {
      getStatus: () => LicenseStatus;
    };
  };
}
export interface LicenseStatus {
  isValid: boolean;
  message?: string;
}
