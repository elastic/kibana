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
import { EsArchiver } from '../../src/es_archiver';

/**
 * Intersect this with any type that is loaded async to give it the `init()` function
 */
interface AsyncService<T> {
  /**
   * Services that are initialized async are not ready before the tests execute, so you might need
   * to call `init()` and await the promise it returns before interacting with the service
   */
  init(): Promise<T>;
}

/**
 * place Service-specific types here
 */
interface ServiceTypes {
  esArchiver: EsArchiver & AsyncService<EsArchiver>;
  log: ToolingLog;

  // TODO: type these services
  browser: any;
  retry: any;
}

/**
 * place PageObject-specific types here
 */
interface PageObjectTypes {
  // TODO: type these page objects
  common: any;
  console: any;
}

// helper to extract value type in array of strings
type ValuesOf<T extends string[]> = T extends Array<infer X> ? X : unknown;

export interface FtrProviderContext {
  getService<T extends keyof ServiceTypes>(serviceName: T): ServiceTypes[T];

  getPageObjects<T extends Array<keyof PageObjectTypes>>(
    pageObjectNames: T
  ): { [K in ValuesOf<T>]: PageObjectTypes[K] };

  loadTestFile(path: string): void;
}
