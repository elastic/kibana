import { pluck, reduce, size } from 'lodash';

export function IndicesGetIndicesProvider(esAdmin) {
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
    const aliases = await esAdmin.indices.getAlias({ index: query, allowNoIndices: true, ignore: 404 });

    // If aliases return 200, they'll include matching indices, too.
    if (aliases.status === 404) {
      const indices = await esAdmin.cat.indices({ index: query, format: 'json', ignore: 404 });
      return getIndexNamesFromIndicesResponse(indices);
    }

    return getIndexNamesFromAliasesResponse(aliases);
  };
}
