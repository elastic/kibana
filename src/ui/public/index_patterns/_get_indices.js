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

export function IndexPatternsGetIndicesProvider(esAdmin) {
  return async function getIndices() {
    const aliasesJson = await esAdmin.indices.getAlias();
    return getIndicesFromResponse(aliasesJson);
  };
}
