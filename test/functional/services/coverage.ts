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
import { FtrProviderContext } from '../ftr_provider_context';

export async function CoverageProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  class Coverage {
    private __coverage__: any[] = [];

    private merge() {
      // TODO implement objects merging
    }

    public addCoverage(data: string) {
      // preserve newlines, etc - use valid JSON
      // str.replace(/\\"/g, `"`)
      let str = data.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      // .replace(/\\/g, '\');
      // .replace(/\\n/g, '\\n')
      // .replace(/\\'/g, `\\'`)
      // .replace(/\\"/g, '\\"')
      // .replace(/\\&/g, '\\&')
      // .replace(/\\r/g, '\\r')
      // .replace(/\\t/g, '\\t')
      // .replace(/\\b/g, '\\b')
      // .replace(/\\f/g, '\\f')
      // remove last character `"`
      str = str.slice(0, -1);
      // remove non-printable and other non-valid JSON chars
      // str = str.replace(/[\u0000-\u0019]+/g, '');
      try {
        const json = JSON.parse(str);
        this.__coverage__.push(json);
      } catch (err) {
        log.warning(`Failed to parse JSON: ${err}`);
      }
    }

    public getCoverage() {
      return this.__coverage__;
    }
  }

  return new Coverage();
}
