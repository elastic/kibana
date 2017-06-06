import { map, flatten, pluck } from 'lodash';

const getIndexPatternsFromResponse = json => {
  return map(flatten(pluck(json, 'index_patterns')));
};

export function IndexPatternsGetTemplateIndexPatternsProvider(esAdmin) {
  return async function getTemplateIndexPatterns(query) {
    try {
      const templatesJson = await esAdmin.indices.getTemplate({ name: query });
      return getIndexPatternsFromResponse(templatesJson);
    } catch (e) {
      if (e && e.status === 404) {
        return [];
      }
      throw e;
    }
  };
}
