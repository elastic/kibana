/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMXPackAuthAdapter } from '../adapters/auth';
import { UMKibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchMonitorsAdapter } from '../adapters/monitors';
import { ElasticsearchPingsAdapter } from '../adapters/pings';
import { UMAuthDomain, UMMonitorsDomain, UMPingsDomain } from '../domains';
import { UMDomainLibs, UMServerLibs } from '../lib';
import { UMMonitorStatesDomain } from '../domains/monitor_states';
import { ElasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';

export function compose(
  hapiServer: any,
  es: any,
  xpack: any,
  register: any,
  route: any
): UMServerLibs {
  // console.log('from kibana compose', hapiServer);
  // console.log('from kibana', hapiServer.route);
  console.log('regreg', register);
  const framework = new UMKibanaBackendFrameworkAdapter(hapiServer, register, route);
  const database = new UMKibanaDatabaseAdapter(es);

  const pingsDomain = new UMPingsDomain(new ElasticsearchPingsAdapter(database), {});
  const authDomain = new UMAuthDomain(new UMXPackAuthAdapter(xpack), {});
  const monitorsDomain = new UMMonitorsDomain(new ElasticsearchMonitorsAdapter(database), {});
  const monitorStatesDomain = new UMMonitorStatesDomain(
    new ElasticsearchMonitorStatesAdapter(database),
    {}
  );

  const domainLibs: UMDomainLibs = {
    auth: authDomain,
    monitors: monitorsDomain,
    monitorStates: monitorStatesDomain,
    pings: pingsDomain,
  };

  const libs: UMServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License;
//  * you may not use this file except in compliance with the Elastic License.
//  */

// import { UMXPackAuthAdapter } from '../adapters/auth';
// import { UMKibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
// import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
// import { ElasticsearchMonitorsAdapter } from '../adapters/monitors';
// import { ElasticsearchPingsAdapter } from '../adapters/pings';
// import { UMAuthDomain, UMMonitorsDomain, UMPingsDomain } from '../domains';
// import { UMDomainLibs, UMServerLibs } from '../lib';
// import { UMMonitorStatesDomain } from '../domains/monitor_states';
// import { ElasticsearchMonitorStatesAdapter } from '../adapters/monitor_states';
// import { KibanaServer } from '../..';

// export type ServerFascade = {
//   elasticsearch: any;
//   route: (route: any) => void;
//   register: <T>(options: any) => void;
//   xpackMain: any;
// } & KibanaServer;

// export function compose({
//   elasticsearch,
//   route,
//   register,
//   xpackMain,
// }: ServerFascade): UMServerLibs {
//   console.log(route);
//   console.log(register);
//   const framework = new UMKibanaBackendFrameworkAdapter(route, register);
//   const database = new UMKibanaDatabaseAdapter(elasticsearch);

//   const pingsDomain = new UMPingsDomain(new ElasticsearchPingsAdapter(database), {});
//   const authDomain = new UMAuthDomain(new UMXPackAuthAdapter(xpackMain), {});
//   const monitorsDomain = new UMMonitorsDomain(new ElasticsearchMonitorsAdapter(database), {});
//   const monitorStatesDomain = new UMMonitorStatesDomain(
//     new ElasticsearchMonitorStatesAdapter(database),
//     {}
//   );

//   const domainLibs: UMDomainLibs = {
//     auth: authDomain,
//     monitors: monitorsDomain,
//     monitorStates: monitorStatesDomain,
//     pings: pingsDomain,
//   };

//   const libs: UMServerLibs = {
//     framework,
//     database,
//     ...domainLibs,
//   };

//   return libs;
// }
