import chrome from 'ui/chrome';
import { ErrorAutoCreateIndexProvider } from 'ui/error_auto_create_index';

import { SavedObjectsClient } from './saved_objects_client';

export function SavedObjectsClientProvider($http, $q, Private) {
  const errorAutoCreateIndex = Private(ErrorAutoCreateIndexProvider);

  return new SavedObjectsClient({
    $http,
    basePath: chrome.getBasePath(),
    PromiseConstructor: $q,
    onCreateFailure(error) {
      if (errorAutoCreateIndex.test(error)) {
        return errorAutoCreateIndex.takeover();
      }

      throw error;
    }
  });
}
