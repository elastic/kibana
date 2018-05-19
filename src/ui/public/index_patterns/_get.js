import _ from 'lodash';
import { SavedObjectsClientProvider } from '../saved_objects';

export function IndexPatternsGetProvider(Private) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  // many places may require the id list, so we will cache it separately
  // didn't incorporate with the indexPattern cache to prevent id collisions.
  let cachedIdPromise;

  const get = function (field) {
    if (field === 'id' && cachedIdPromise) {
      // return a clone of the cached response
      return cachedIdPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    const promise = savedObjectsClient.find({
      type: 'index-pattern',
      fields: [],
      perPage: 10000
    }).then(resp => {
      return resp.savedObjects.map(obj => _.get(obj, field));
    });

    if (field === 'id') {
      cachedIdPromise = promise;
    }

    // ensure that the response stays pristine by cloning it here too
    return promise.then(function (resp) {
      return _.clone(resp);
    });
  };

  return (field) => {
    const getter = get.bind(get, field);
    if (field === 'id') {
      getter.clearCache = function () {
        cachedIdPromise = null;
      };
    }
    return getter;
  };
}
