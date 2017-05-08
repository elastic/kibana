import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function IndexPatternsGetIdsProvider(Private) {
  const savedObjectClients = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedPromise;

  const getIds = function () {
    if (!cachedPromise) {
      cachedPromise = savedObjectClients.getIds('index-pattern')
        .then(resp => resp.ids);
    }

    // return a clone of the cached response
    return cachedPromise.then(_.clone);
  };

  getIds.clearCache = function () {
    cachedPromise = null;
  };

  return getIds;
}
