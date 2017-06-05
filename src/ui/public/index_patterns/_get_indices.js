import { reduce, map, size } from 'lodash';

const getIndicesFromResponse = json => {
  return reduce(json, (list, { aliases }, indexName) => {
    list.push(convertToMatchedIndex(indexName));
    if (size(aliases) > 0) {
      list.push(...map(Object.keys(aliases), convertToMatchedIndex));
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

export function convertToMatchedIndex(indexName, isFromTemplate = false) {
  return { indexName, isFromTemplate };
}
