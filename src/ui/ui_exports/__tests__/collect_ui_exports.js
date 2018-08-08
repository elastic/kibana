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

import expect from 'expect.js';

import { PluginPack } from '../../../plugin_discovery';

import { collectUiExports } from '../collect_ui_exports';

const specs = new PluginPack({
  path: '/dev/null',
  pkg: {
    name: 'test',
    version: 'kibana'
  },
  provider({ Plugin }) {
    return [
      new Plugin({
        id: 'test',
        uiExports: {
          visTypes: [
            'plugin/test/visType1',
            'plugin/test/visType2',
            'plugin/test/visType3',
          ]
        }
      }),
      new Plugin({
        id: 'test2',
        uiExports: {
          visTypes: [
            'plugin/test2/visType1',
            'plugin/test2/visType2',
            'plugin/test2/visType3',
          ]
        }
      }),
    ];
  }
}).getPluginSpecs();

describe('plugin discovery', () => {
  describe('collectUiExports()', () => {
    it('merges uiExports from all provided plugin specs', () => {
      const uiExports = collectUiExports(specs);
      const exported = uiExports.appExtensions.visTypes
        .sort((a, b) => a.localeCompare(b));

      expect(exported).to.eql([
        'plugin/test/visType1',
        'plugin/test/visType2',
        'plugin/test/visType3',
        'plugin/test2/visType1',
        'plugin/test2/visType2',
        'plugin/test2/visType3'
      ]);
    });
  });
});
