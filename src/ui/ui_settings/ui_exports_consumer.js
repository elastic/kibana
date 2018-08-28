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
 *  The UiExports class accepts consumer objects that it consults while
 *  trying to consume all of the `uiExport` declarations provided by
 *  plugins.
 *
 *  UiExportConsumer is instantiated and passed to UiExports, then for
 *  every `uiExport` declaration the `exportConsumer(type)` method is
 *  with the key of the declaration. If this consumer knows how to handle
 *  that key we return a function that will be called with the plugins
 *  and values of all declarations using that key.
 *
 *  With this, the consumer merges all of the declarations into the
 *  _uiSettingDefaults map, ensuring that there are not collisions along
 *  the way.
 *
 *  @class UiExportsConsumer
 */
export class UiExportsConsumer {
  _uiSettingDefaults = {};

  exportConsumer(type) {
    switch (type) {
      case 'uiSettingDefaults':
        return (plugin, settingDefinitions) => {
          Object.keys(settingDefinitions).forEach((key) => {
            if (key in this._uiSettingDefaults) {
              throw new Error(`uiSettingDefaults for key "${key}" are already defined`);
            }

            this._uiSettingDefaults[key] = settingDefinitions[key];
          });
        };
    }
  }

  /**
   *  Get the map of uiSettingNames to "default" specifications
   *  @return {Object<String,UiSettingsDefault>}
   */
  getUiSettingDefaults() {
    return this._uiSettingDefaults;
  }
}
