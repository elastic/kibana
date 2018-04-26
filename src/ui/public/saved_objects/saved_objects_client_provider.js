import { ErrorAutoCreateIndexProvider } from '../error_auto_create_index';

import { SavedObjectsClient } from './saved_objects_client';

export function SavedObjectsClientProvider($http, $q, Private) {
  const errorAutoCreateIndex = Private(ErrorAutoCreateIndexProvider);

  return new SavedObjectsClient({
    $http,
    PromiseConstructor: $q,
    onCreateFailure(error) {
      if (errorAutoCreateIndex.test(error)) {
        return errorAutoCreateIndex.takeover();
      }

      throw error;
    }
  });
}
