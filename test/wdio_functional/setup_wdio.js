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
import {
  ProviderCollection
} from '../../src/functional_test_runner/lib/providers';
import {
  readConfigFile
} from '../../src/functional_test_runner/lib';

export async function setupWebdriverio() {

  const logger = require('@kbn/dev-utils').createToolingLog('debug');
  logger.pipe(process.stdout);

  const testConfig = await readConfigFile(logger, require.resolve('./config'), {}, require('./test_config_schema').schema);

  const providers = new ProviderCollection(
    logger,
    [
      {
        type: 'Service',
        name: 'config',
        fn: () => testConfig
      },
      {
        type: 'Service',
        name: 'log',
        fn: () => logger
      },
      ...Object.keys(testConfig.get('services')).map(name => {
        return {
          type: 'Service',
          name,
          fn: testConfig.get('services')[name],
        };
      })
    ]
  );
  return providers;
}
