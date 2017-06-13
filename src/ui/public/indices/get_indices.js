import { reduce, size } from 'lodash';

const getIndicesFromResponse = json => {
  return reduce(json, (list, { aliases }, indexName) => {
    list.push(indexName);
    if (size(aliases) > 0) {
      list.push(...Object.keys(aliases));
    }
    return list;
  }, []);
};

export function IndicesGetIndicesProvider(esAdmin) {
  return async function getIndices(query) {
    try {
      const aliasesJson = await esAdmin.indices.getAlias({ index: query });
      return getIndicesFromResponse(aliasesJson);
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
