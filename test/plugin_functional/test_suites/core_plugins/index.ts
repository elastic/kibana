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
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('core plugins', () => {
    loadTestFile(require.resolve('./applications'));
    loadTestFile(require.resolve('./legacy_plugins'));
    loadTestFile(require.resolve('./server_plugins'));
    loadTestFile(require.resolve('./ui_plugins'));
    loadTestFile(require.resolve('./ui_settings'));
    loadTestFile(require.resolve('./top_nav'));
    loadTestFile(require.resolve('./application_leave_confirm'));
    loadTestFile(require.resolve('./application_status'));
    loadTestFile(require.resolve('./rendering'));
    loadTestFile(require.resolve('./logging'));
  });
}
