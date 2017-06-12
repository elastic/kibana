export class UiExportsConsumer {
  _uiSettingDefaults = {
    'buildNum': {
      readonly: true
    }
  };

  exportConsumer(type) {
    switch (type) {
      case 'uiSettingDefaults':
        return (plugin, settingDefinitions) => {
          this._uiSettingDefaults = {
            ...this._uiSettingDefaults,
            ...settingDefinitions,
          };
        };
        break;
    }
  }

  getUiSettingDefaults() {
    return this._uiSettingDefaults;
  }
}
