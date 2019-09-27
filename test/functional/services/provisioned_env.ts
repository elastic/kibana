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

import dotEnv, { DotenvParseOutput } from 'dotenv';
import { FtrProviderContext } from '../ftr_provider_context';

export async function ProvisionedEnvProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  class ProvisionedEnv {
    public readonly pathToEnvFile: string =
      config.get('stackFunctionalIntegrationTests.pathToProvisionedEnvFile');
    public readonly envObj: DotenvParseOutput | undefined;


    constructor() {
      log.debug(`Get environment file from integration-test repo at path: \n${this.pathToEnvFile}`)
      this.envObj = dotEnv.config({ path: this.pathToEnvFile}).parsed;
    }
  }

  return new ProvisionedEnv();
}
