/**
 *  The UiExports class accepts consumer objects that is consults while
 *  trying to consume all of the `uiExport` declarations provided by
 *  plugins.
 *
 *  UiExportConsumer is instantiated and passed to UiExports, then for
 *  every `uiExport` declaration it calls `exportConsumer(type)` with
 *  the key of the declaration. If this consumer knows how to handle
 *  that key it should return a function that will be called with the
 *  plugins and values of all matching declarations.
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
