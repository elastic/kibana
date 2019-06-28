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

import { resolve } from 'path';

// TODO: use something better once https://github.com/elastic/kibana/issues/26555 is
// figured out.
type KibanaPlugin = any;

function samplePanelAction(kibana: KibanaPlugin) {
  return new kibana.Plugin({
    publicDir: resolve(__dirname, './public'),
    uiExports: {
      contextMenuActions: [
        'plugins/kbn_tp_sample_panel_action/sample_panel_action',
        'plugins/kbn_tp_sample_panel_action/sample_panel_link',
      ],
    },
  });
}

module.exports = (kibana: KibanaPlugin) => {
  return [samplePanelAction(kibana)];
};
