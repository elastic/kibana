import _ from 'lodash';
export default function GetIndexPatternIdsFn(esAdmin, kbnIndex) {

  // many places may require the id list, so we will cache it seperately
  // didn't incorportate with the indexPattern cache to prevent id collisions.
  let cachedPromise;

  const getIds = function () {
    if (cachedPromise) {
      // retrun a clone of the cached response
      return cachedPromise.then(function (cachedResp) {
        return _.clone(cachedResp);
      });
    }

    cachedPromise = esAdmin.search({
      index: kbnIndex,
      type: 'index-pattern',
      storedFields: [],
      body: {
        query: { match_all: {} },
        size: 10000
      }
    })
    .then(function (resp) {
      return _.pluck(resp.hits.hits, '_id');
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
