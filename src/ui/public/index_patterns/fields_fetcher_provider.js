import { createFieldsFetcher } from './fields_fetcher';
import { IndexPatternsApiClientProvider } from './index_patterns_api_client_provider';

export function FieldsFetcherProvider(Private, config) {
  const apiClient = Private(IndexPatternsApiClientProvider);
  return createFieldsFetcher(apiClient, config);
}
