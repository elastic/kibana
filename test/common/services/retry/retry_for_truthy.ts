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

import { ToolingLog } from '@kbn/dev-utils';

import { retryForSuccess } from './retry_for_success';

interface Options {
  timeout: number;
  methodName: string;
  description: string;
  block: () => Promise<boolean>;
  onFailureBlock?: () => Promise<any>;
}

export async function retryForTruthy(
  log: ToolingLog,
  { timeout, methodName, description, block, onFailureBlock }: Options
) {
  log.debug(`Waiting up to ${timeout}ms for ${description}...`);

  await retryForSuccess(log, {
    timeout,
    methodName,
    block,
    onFailureBlock,
    onFailure: lastError => {
      let msg = `timed out waiting for ${description}`;

      if (lastError) {
        msg = `${msg} -- last error: ${lastError.stack || lastError.message}`;
      }

      throw new Error(msg);
    },
    accept: result => Boolean(result),
  });
}
