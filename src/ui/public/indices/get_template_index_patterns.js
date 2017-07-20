import { flatten, pluck, uniq } from 'lodash';
import chrome from 'ui/chrome';

const getIndexPatternsFromResponse = json => {
  return uniq(flatten(pluck(json, 'index_patterns')));
};

export function IndicesGetTemplateIndexPatternsProvider($http) {
  return async function getTemplateIndexPatterns(query) {
    const indexTemplatePath = chrome.addBasePath('/api/kibana/legacy_admin_index_template');
    const templatesJson = await $http.get(indexTemplatePath, { name: query });
    return getIndexPatternsFromResponse(templatesJson.data);
  };
}
