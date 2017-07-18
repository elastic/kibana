import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function IndexPatternsGetIdsProvider(Private) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedPromise;

  const getIds = function () {
    if (cachedPromise) {
      // return a clone of the cached response
      return cachedPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    cachedPromise = savedObjectsClient.find({
      type: 'index-pattern',
      fields: [],
      perPage: 10000
    }).then(resp => {
      return resp.savedObjects.map(obj => obj.id);
    });

    // ensure that the response stays pristine by cloning it here too
    return cachedPromise.then(function (resp) {
      return _.clone(resp);
    });
  };

  getIds.clearCache = function () {
    cachedPromise = null;
  };

  return getIds;
}
