import chrome from 'ui/chrome';
import { createIndexPatternsApiClient } from './index_patterns_api_client';

export function IndexPatternsApiClientProvider($http) {
  return createIndexPatternsApiClient($http, chrome.getBasePath());
}
