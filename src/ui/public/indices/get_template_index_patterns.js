import { flatten, pluck, uniq } from 'lodash';

const getIndexPatternsFromResponse = json => {
  return uniq(flatten(pluck(json, 'index_patterns')));
};

export function IndicesGetTemplateIndexPatternsProvider(esAdmin) {
  return async function getTemplateIndexPatterns(query) {
    const templatesJson = await esAdmin.indices.getTemplate({ name: query, ignore: 404 });
    return getIndexPatternsFromResponse(templatesJson);
  };
}
