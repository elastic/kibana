import { IndicesApiClientProvider } from './indices_api_client_provider';

export function IndicesGetIndicesProvider(Private) {
  const indicesApiClient = Private(IndicesApiClientProvider);

  return async function getIndices(pattern, maxNumberOfMatchingIndices = 10, useDataCluster = true) {
    return await indicesApiClient.search({ pattern, maxNumberOfMatchingIndices, useDataCluster });
  };
}
