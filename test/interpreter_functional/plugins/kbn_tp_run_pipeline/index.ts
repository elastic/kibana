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
import { Legacy } from 'kibana';
import {
  ArrayOrItem,
  LegacyPluginApi,
  LegacyPluginSpec,
  LegacyPluginOptions,
} from 'src/legacy/plugin_discovery/types';

// eslint-disable-next-line import/no-default-export
export default function(kibana: LegacyPluginApi): ArrayOrItem<LegacyPluginSpec> {
  const pluginSpec: Partial<LegacyPluginOptions> = {
    id: 'kbn_tp_run_pipeline',
    uiExports: {
      app: {
        title: 'Run Pipeline',
        description: 'This is a sample plugin to test running pipeline expressions',
        main: 'plugins/kbn_tp_run_pipeline/legacy',
      },
    },

    init(server: Legacy.Server) {
      // The following lines copy over some configuration variables from Kibana
      // to this plugin. This will be needed when embedding visualizations, so that e.g.
      // region map is able to get its configuration.
      server.injectUiAppVars('kbn_tp_run_pipeline', async () => {
        return server.getInjectedUiAppVars('kibana');
      });
    },
  };
  return new kibana.Plugin(pluginSpec);
}
