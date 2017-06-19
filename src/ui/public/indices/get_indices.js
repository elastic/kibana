import { pluck } from 'lodash';

export function IndicesGetIndicesProvider(esAdmin) {
  return async function getIndices(query) {
    const catIndices = await esAdmin.cat.indices({ index: query, format: 'json', ignore: 404 });
    const catAliases = await esAdmin.cat.aliases({ name: query, format: 'json', ignore: 404 });

    const indices = pluck(catIndices, 'index');
    if (Array.isArray(catAliases)) {
      indices.push(...pluck(catAliases, 'index'));
    }
    return indices;
  };
}
