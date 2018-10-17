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

/**
 * A hidden parameter can be hidden from the UI completely.
 */
interface Param {
  hidden?: boolean;
  help?: string;
}

/**
 * A fixed parameter has a fixed value for a specific field.
 * It can optionally also be hidden.
 */
export type FixedParam = Partial<Param> & {
  fixedValue: any;
};

/**
 * Numeric interval parameters must always be set in the editor to a multiple of
 * the specified base. It can optionally also be hidden.
 */
export type NumericIntervalParam = Partial<Param> & {
  base: number;
};

/**
 * Time interval parameters must always be set in the editor to a multiple of
 * the specified base. It can optionally also be hidden.
 */
export type TimeIntervalParam = Partial<Param> & {
  default: string;
  timeBase: string;
};

export type EditorParamConfig = NumericIntervalParam | TimeIntervalParam | FixedParam | Param;

export interface EditorConfig {
  [paramName: string]: EditorParamConfig;
}
