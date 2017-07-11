import { pluck, reduce, size } from 'lodash';

const getIndexNamesFromAliasesResponse = response => {
  if (response.status === 404) {
    return [];
  }

  return reduce(response, (list, { aliases }, indexName) => {
    if (size(aliases) > 0) {
      list.push(...Object.keys(aliases).map(alias => ({
        name: alias,
      })));
    }

    return list;
  }, []);
};

const getIndexNamesFromSearchResponse = response => {
  if (
    response.status === 404
    || !response.aggregations
  ) {
    return [];
  }

  return response.aggregations.indices.buckets.map(bucket => ({
    name: bucket.key,
    docCount: bucket.doc_count,
  }));
};

export function IndicesGetIndicesProvider(esAdmin) {
  return async function getIndices(indexPattern, maxNumberOfMatchingIndices) {
    if (!indexPattern) {
      throw new Error('Please provide an indexPattern string to getIndices().');
    }

    if (!maxNumberOfMatchingIndices || maxNumberOfMatchingIndices < 0) {
      throw new Error('Please provide a maxNumberOfMatchingIndices value greater than 0 to getIndices().');
    }

    // Cross-cluster search query missing the index pattern part.
    if (!indexPattern.split(':')[1]) {
      return [];
    }

    // const aliasesResponse = await esAdmin.indices.getAlias({
    //   index: indexPattern,
    //   allowNoIndices: true,
    //   ignore: 404,
    // });

    const aliases = [];//getIndexNamesFromAliasesResponse(aliasesResponse);

    const searchResponse = await esAdmin.search({
      index: indexPattern,
      ignore: [404],
      allow_no_indices: true,
      body: {
        size: 0, // no hits
        aggs: {
          indices: {
            terms: {
              field: '_index',
              size: maxNumberOfMatchingIndices,
            }
          }
        }
      }
    });

    const indices = getIndexNamesFromSearchResponse(searchResponse);

    return [...new Set([...aliases, ...indices])];
  };
}
