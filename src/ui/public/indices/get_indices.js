export function IndicesGetIndicesProvider(esAdmin) {
  return async function getIndices(indexPattern, maxNumberOfMatchingIndices) {
    if (!indexPattern) {
      throw new Error('Please provide an indexPattern string to getIndices().');
    }

    if (!maxNumberOfMatchingIndices || maxNumberOfMatchingIndices < 0) {
      throw new Error('Please provide a maxNumberOfMatchingIndices value greater than 0 to getIndices().');
    }

    const result = await esAdmin.search({
      index: indexPattern,
      ignore: [404],
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

    if (
      result.status === 404
      || !result.aggregations
    ) {
      return [];
    }

    const indices = result.aggregations.indices.buckets.map(bucket => ({
      name: bucket.key,
      docCount: bucket.doc_count,
    }));

    return indices;
  };
}
