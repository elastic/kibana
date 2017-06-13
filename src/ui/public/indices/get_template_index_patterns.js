import { flatten, pluck, uniq } from 'lodash';

const getIndexPatternsFromResponse = json => {
  return uniq(flatten(pluck(json, 'index_patterns')));
};

export function IndicesGetTemplateIndexPatternsProvider(esAdmin) {
  return async function getTemplateIndexPatterns(query) {
    try {
      const templatesJson = await esAdmin.indices.getTemplate({ name: query });
      return getIndexPatternsFromResponse(templatesJson);
    } catch (e) {
      // A 404 means the query did not find any indices
      // That is not a failure scenario for this use case
      if (e && e.status === 404) {
        return [];
      }
      throw e;
    }
  };
}
