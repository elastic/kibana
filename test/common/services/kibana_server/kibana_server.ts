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

import { format as formatUrl } from 'url';

import { FtrProviderContext } from '../../ftr_provider_context';
import { KibanaServerStatus } from './status';
import { KibanaServerUiSettings } from './ui_settings';
import { KibanaServerVersion } from './version';
import { KibanaServerSavedObjects } from './saved_objects';

export function KibanaServerProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');

  const url = formatUrl(config.get('servers.kibana'));

  return new (class KibanaServer {
    public readonly status = new KibanaServerStatus(url);
    public readonly version = new KibanaServerVersion(this.status);
    public readonly savedObjects = new KibanaServerSavedObjects(url, log);
    public readonly uiSettings = new KibanaServerUiSettings(
      url,
      log,
      config.get('uiSettings.defaults'),
      lifecycle
    );
  })();
}
