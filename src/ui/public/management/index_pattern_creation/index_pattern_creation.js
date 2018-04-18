import { uiRegistry } from 'ui/registry/_registry';

export const IndexPatternCreationRegistry = uiRegistry({
  name: 'indexPatternCreation',
  index: ['name'],
  order: ['order'],
});

class IndexPatternCreation {
  constructor(registry, httpClient, type) {
    this._registry = registry;
    this._allTypes = this._registry.inOrder.map(Plugin => new Plugin(httpClient));
    this._setCurrentType(type);
  }

  _setCurrentType = (type) => {
    const index = type ? this._registry.inOrder.findIndex(Plugin => Plugin.key === type) : -1;
    this._currentType = index > -1 && this._allTypes[index] ? this._allTypes[index] : null;
  }

  getType = () => {
    return this._currentType || null;
  }

  getIndexPatternCreationOptions = async (urlHandler) => {
    const options = [];
    await Promise.all(this._allTypes.map(async type => {
      const option = type.getIndexPatternCreationOption ? await type.getIndexPatternCreationOption(urlHandler) : null;
      if(option) {
        options.push(option);
      }
    }));
    return options;
  }
}

export const IndexPatternCreationFactory = (Private, $http) => {
  return (type = 'default') => {
    const indexPatternCreationRegistry = Private(IndexPatternCreationRegistry);
    const indexPatternCreationProvider = new IndexPatternCreation(indexPatternCreationRegistry, $http, type);
    return indexPatternCreationProvider;
  };
};
