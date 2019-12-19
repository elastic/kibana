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

import { CoreSetup, Plugin } from 'kibana/public';

declare global {
  interface Window {
    uiSettingsPlugin?: Record<string, any>;
    uiSettingsPluginValue?: string;
  }
}

export class UiSettingsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    window.uiSettingsPlugin = core.uiSettings.getAll().ui_settings_plugin;
    window.uiSettingsPluginValue = core.uiSettings.get('ui_settings_plugin');
  }

  public start() {}
  public stop() {}
}
