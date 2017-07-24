import { pluck, reduce, size } from 'lodash';
import chrome from 'ui/chrome';

export function IndicesGetIndicesProvider($http) {
  const getIndexNamesFromAliasesResponse = json => {
    // Assume this function won't be called in the event of a 404.
    return reduce(json, (list, { aliases }, indexName) => {
      list.push(indexName);
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }
      return list;
    }, []);
  };

  const getIndexNamesFromIndicesResponse = json => {
    if (json.status === 404) {
      return [];
    }

    return pluck(json, 'index');
  };

  return async function getIndices(query) {
    const aliasesPath = chrome.addBasePath('/api/kibana/legacy_admin_aliases');
    const aliases = await $http.get(aliasesPath, { index: query });

    // If aliases return 200, they'll include matching indices, too.
    if (aliases.status === 404) {
      const indicesPath = chrome.addBasePath('/api/kibana/legacy_admin_indices');
      const indices = await $http.get(indicesPath, { index: query });
      return getIndexNamesFromIndicesResponse(indices.data);
    }

    return getIndexNamesFromAliasesResponse(aliases.data);
  };
}
