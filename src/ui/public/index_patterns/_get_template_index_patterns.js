import { map, flatten, pluck } from 'lodash';

const getIndexPatternsFromResponse = json => {
  return map(flatten(pluck(json, 'index_patterns')));
};

export function IndexPatternsGetTemplateIndexPatternsProvider(esAdmin) {
  return async function getTemplateIndexPatterns() {
    const templatesJson = await esAdmin.indices.getTemplate();
    return getIndexPatternsFromResponse(templatesJson);
  };
}
