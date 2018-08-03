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

import path from 'path';

export default async function ({ readConfigFile }) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [
      require.resolve('./index'),
    ],
    services: functionalConfig.get('services'),
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    env: functionalConfig.get('env'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: functionalConfig.get('apps'),
    esArchiver: {
      directory: path.resolve(__dirname, '../es_archives')
    },
    screenshots: functionalConfig.get('screenshots'),
    junit: {
      reportName: 'Panel Actions Functional Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${path.resolve(__dirname, './sample_panel_action')}`,
      ],
    },
  };
}
