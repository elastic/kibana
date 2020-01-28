/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UMBackendFrameworkAdapter,
  UMMonitorsAdapter,
  UMMonitorStatesAdapter,
  UMSavedObjectsAdapter,
  UMElasticsearchQueryFn,
} from './adapters';
import { UMLicenseCheck } from './domains';
import { GetPingsParams } from './database_calls/get_pings';
import { PingResults, Ping, DocCount } from '../../common/graphql/types';
import { GetLatestMonitorParams, GetMonitorParams, GetPingHistogramParams } from './database_calls';
import { HistogramResult } from '../../common/domain_types';

type ESQ<P, R> = UMElasticsearchQueryFn<P, R>;

interface ElasticsearchCalls {
  getDocCount: ESQ<{}, DocCount>;
  getLatestMonitor: ESQ<GetLatestMonitorParams, Ping>;
  getMonitor: ESQ<GetMonitorParams, Ping>;
  getPings: ESQ<GetPingsParams, PingResults>;
  getPingHistogram: ESQ<GetPingHistogramParams, HistogramResult>;
}

export interface UMDomainLibs {
  db: ElasticsearchCalls;
  license: UMLicenseCheck;
  monitors: UMMonitorsAdapter;
  monitorStates: UMMonitorStatesAdapter;
  savedObjects: UMSavedObjectsAdapter;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}
