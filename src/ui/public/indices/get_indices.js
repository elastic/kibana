import { pluck, reduce, size } from 'lodash';

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
    const aliases = await esAdmin.indices.getAlias({ index: query, format: 'json', allowNoIndices: true, ignore: 404 });

    if (aliases.status === 404) {
      const indices = await esAdmin.cat.indices({ index: query, format: 'json', ignore: 404 });
      return pluck(indices, 'index');
    }

    return getIndicesFromResponse(aliases);
  };
}
