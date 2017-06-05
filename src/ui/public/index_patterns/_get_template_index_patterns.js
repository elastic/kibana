import { reduce, map, size, flatten, pluck, uniq, sortBy } from 'lodash';
import { convertToMatchedIndex } from './_get_indices';

const getIndexPatternsFromResponse = json => {
  return map(flatten(pluck(json, 'index_patterns')), pattern => convertToMatchedIndex(pattern, true));
};

export function IndexPatternsGetTemplateIndexPatternsProvider(esAdmin) {
  return async function getTemplateIndexPatterns() {
    const templatesJson = await esAdmin.indices.getTemplate();
    return getIndexPatternsFromResponse(templatesJson);
  };
}
