import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function IndexPatternsGetProvider(Private) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  const cachedPromises = {};

  const get = function (field) {
    if (cachedPromises[field]) {
      // return a clone of the cached response
      return cachedPromises[field].then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    cachedPromises[field] = savedObjectsClient.find({
      type: 'index-pattern',
      fields: [],
      perPage: 10000
    }).then(resp => {
      return resp.savedObjects.map(obj => _.get(obj, field));
    });

    // ensure that the response stays pristine by cloning it here too
    return cachedPromises[field].then(function (resp) {
      return _.clone(resp);
    });
  };

  return (field) => {
    const getter = get.bind(get, field);
    getter.clearCache = function () {
      delete cachedPromises[field];
    };
    return getter;
  };
}
