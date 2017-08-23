import { Promise } from 'bluebird';

export function connectBluebirdToAngular(app) {
  app.run(function ($rootScope, $q) {
    if (!Promise.ignoreSetScheduler) {
      // This ensures that resolutions/rejections are ran
      // within Angular's digest loop:
      Promise.setScheduler(function (fn) {
        $rootScope.$evalAsync(fn);
      });

      // Wrap the promise's resolution/rejection within a $q.defer promise.
      // eslint-disable-next-line no-extend-native
      Promise.prototype.qDeferred = function () {
        const deferred = $q.defer();
        this.then(deferred.resolve, deferred.reject);
        return deferred.promise;
      };
    }
  });
}
