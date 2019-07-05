/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { format as formatUrl } from 'url';
import { OPTIMIZE_BUNDLE_DIR, esTestConfig, kbnTestConfig } from '@kbn/test';
import {
  KibanaServerProvider,
  EsProvider,
  EsArchiverProvider,
  RetryProvider,
} from './services';

export default function () {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  return {
    servers,

    esTestCluster: {
      license: 'oss',
      from: 'snapshot',
      serverArgs: [
      ],
    },

    kbnTestServer: {
      buildArgs: [ '--optimize.useBundleCache=true' ],
      sourceArgs: [
        '--no-base-path',
        `--optimize.bundleDir=${OPTIMIZE_BUNDLE_DIR}`,
      ],
      serverArgs: [
        '--env.name=development',
        '--logging.json=false',
        `--server.port=${kbnTestConfig.getPort()}`,
        `--optimize.watchPort=${kbnTestConfig.getPort() + 10}`,
        '--optimize.watchPrebuild=true',
        '--status.allowAnonymous=true',
        '--optimize.enabled=true',
        `--elasticsearch.hosts=${formatUrl(servers.elasticsearch)}`,
        `--elasticsearch.username=${servers.elasticsearch.username}`,
        `--elasticsearch.password=${servers.elasticsearch.password}`,
        `--kibana.disableWelcomeScreen=true`,
      ],
    },

    services: {
      kibanaServer: KibanaServerProvider,
      retry: RetryProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
    }
  };
}
