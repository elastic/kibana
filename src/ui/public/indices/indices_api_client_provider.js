import chrome from 'ui/chrome';
import { indicesApiClient } from './indices_api_client';

export function IndicesApiClientProvider($http) {
  return indicesApiClient($http, chrome.getBasePath());
}
