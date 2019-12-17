/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IScope } from 'angular';
import { RestAPIAdapter } from './adapters/rest_api/adapter_types';
import { AgentsLib } from './agent';
import { PoliciesLib } from './policy';
import { ElasticsearchLib } from './elasticsearch';
import { FrameworkLib } from './framework';
import { EnrollmentApiKeyLib } from './enrollment_api_key';

export interface FrontendLibs {
  elasticsearch: ElasticsearchLib;
  framework: FrameworkLib;
  agents: AgentsLib;
  policies: PoliciesLib;
  enrollmentApiKeys: EnrollmentApiKeyLib;
  httpClient: RestAPIAdapter;
}

export interface KibanaUIConfig {
  get(key: string): any;
  set(key: string, value: any): Promise<boolean>;
}

export interface KibanaAdapterServiceRefs {
  config: KibanaUIConfig;
  rootScope: IScope;
}

export type BufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;
