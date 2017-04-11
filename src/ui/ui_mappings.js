import _ from 'lodash';

class MappingsCollection {
  constructor() {
    this._defaultMappings = {
      '_default_': {
        'dynamic': 'strict'
      },
      config: {
        dynamic: true,
        properties: {
          buildNum: {
            type: 'keyword'
          }
        }
      },
    };
    this._currentMappings = _.cloneDeep(this._defaultMappings);
  }

  getCombined = () => {
    return this._currentMappings;
  }

  register = (newMappings, options = {}) => {
    Object.keys(this._currentMappings).forEach(key => {
      if (newMappings.hasOwnProperty(key)) {
        const pluginPartial = options.plugin ? `registered by plugin ${options.plugin} ` : '';
        throw new Error(`Mappings for ${key} ${pluginPartial}have already been defined`);
        return;
      }
    });
    Object.assign(this._currentMappings, newMappings);
  }
}

export { MappingsCollection };
