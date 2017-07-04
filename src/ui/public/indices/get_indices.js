import { pluck, reduce, size, uniq } from 'lodash';

const getIndexNamesFromAliasesResponse = json => {
  if (json.status === 404) {
    return [];
  }

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

export function IndicesGetIndicesProvider(esAdmin) {
  return async function getIndices(query) {
    if (typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const aliases = await esAdmin.indices.getAlias({ index: query, allowNoIndices: true, ignore: 404 });
    const aliasNames = getIndexNamesFromAliasesResponse(aliases);

    const indices = await esAdmin.cat.indices({ index: query, format: 'json', ignore: 404 });
    const indexNames = getIndexNamesFromIndicesResponse(indices);

    const uniqueIndices = uniq([...aliasNames, ...indexNames]);
    return uniqueIndices;
  };
}
