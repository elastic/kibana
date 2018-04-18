import { uiRegistry } from 'ui/registry/_registry';

export const IndexPatternListRegistry = uiRegistry({
  name: 'indexPatternList',
  index: ['name'],
  order: ['order'],
});

class IndexPatternList {
  constructor(registry) {
    this._plugins = registry.inOrder.map(Plugin => new Plugin);
  }

  getIndexPatternTags = (indexPattern) => {
    return this._plugins.reduce((tags, plugin) => {
      return plugin.getIndexPatternTags ? tags.concat(plugin.getIndexPatternTags(indexPattern)) : tags;
    }, []);
  }

  getFieldInfo = (indexPattern, field) => {
    return this._plugins.reduce((info, plugin) => {
      return plugin.getFieldInfo ? info.concat(plugin.getFieldInfo(indexPattern, field)) : info;
    }, []);
  }
}

export const IndexPatternListFactory = (Private) => {
  return function () {
    const indexPatternListRegistry = Private(IndexPatternListRegistry);
    const indexPatternListProvider = new IndexPatternList(indexPatternListRegistry);
    return indexPatternListProvider;
  };
};
