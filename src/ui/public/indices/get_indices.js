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
    const aliasesJson = await esAdmin.indices.getAlias({ index: query, allowNoIndices: true });
    return getIndicesFromResponse(aliasesJson);
  };
}
