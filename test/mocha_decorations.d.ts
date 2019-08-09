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

import { Suite } from 'mocha';

type Tags =
  | 'ciGroup1'
  | 'ciGroup2'
  | 'ciGroup3'
  | 'ciGroup4'
  | 'ciGroup5'
  | 'ciGroup6'
  | 'ciGroup7'
  | 'ciGroup8'
  | 'ciGroup9'
  | 'ciGroup10'
  | 'ciGroup11'
  | 'ciGroup12';

// We need to use the namespace here to match the Mocha definition
// eslint-disable-next-line @typescript-eslint/no-namespace
declare module 'mocha' {
  interface Suite {
    /**
     * Assign tags to the test suite to determine in which CI job it should be run.
     */
    tags<T extends Tags>(tags: T | T[]): void;
    tags<T extends string>(tags: T | T[]): void;
  }
}
