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

  getUiSettingDefaults() {
    return this._uiSettingDefaults;
  }
}
