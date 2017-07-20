import chrome from 'ui/chrome';

import { SavedObjectsClient } from './saved_objects_client';

export function SavedObjectsClientProvider($http, $q) {
  return new SavedObjectsClient($http, chrome.getBasePath(), $q);
}
