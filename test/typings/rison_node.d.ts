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

declare module 'rison-node' {
  export type RisonValue = null | boolean | number | string | RisonObject | RisonArray;

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface RisonArray extends Array<RisonValue> {}

  export interface RisonObject {
    [key: string]: RisonValue;
  }

  export const decode: (input: string) => RisonValue;

  // eslint-disable-next-line @typescript-eslint/camelcase
  export const decode_object: (input: string) => RisonObject;

  export const encode: <Input extends RisonValue>(input: Input) => string;

  // eslint-disable-next-line @typescript-eslint/camelcase
  export const encode_object: <Input extends RisonObject>(input: Input) => string;
}
