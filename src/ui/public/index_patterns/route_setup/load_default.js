import _ from 'lodash';
import Notifier from 'ui/notify/notifier';
import { NoDefaultIndexPattern, NoDefinedIndexPatterns } from 'ui/errors';
import GetIdsProvider from '../_get_ids';
import CourierDataSourceRootSearchSourceProvider from 'ui/courier/data_source/_root_search_source';
import uiRoutes from 'ui/routes';
let notify = new Notifier({
  location: 'Index Patterns'
});

module.exports = function (opts) {
  opts = opts || {};
  let whenMissingRedirectTo = opts.whenMissingRedirectTo || null;
  let defaultRequiredToasts = null;

  uiRoutes
  .addSetupWork(function loadDefaultIndexPattern(Private, Promise, $route, config, indexPatterns) {
    let getIds = Private(GetIdsProvider);
    let rootSearchSource = Private(CourierDataSourceRootSearchSourceProvider);
    let route = _.get($route, 'current.$$route');

    return getIds()
    .then(function (patterns) {
      let defaultId = config.get('defaultIndex');
      let defined = !!defaultId;
      let exists = _.contains(patterns, defaultId);

      if (defined && !exists) {
        config.remove('defaultIndex');
        defaultId = defined = false;
      }

      if (!defined && route.requireDefaultIndex) {
        throw new NoDefaultIndexPattern();
      }

      return notify.event('loading default index pattern', function () {
        return indexPatterns.get(defaultId).then(function (pattern) {
          rootSearchSource.getGlobalSource().set('index', pattern);
          notify.log('index pattern set to', defaultId);
        });
      });
    });
  })
  .afterWork(
    // success
    null,

    // failure
    function (err, kbnUrl) {
      let hasDefault = !(err instanceof NoDefaultIndexPattern);
      if (hasDefault || !whenMissingRedirectTo) throw err; // rethrow

      kbnUrl.change(whenMissingRedirectTo);
      if (!defaultRequiredToasts) defaultRequiredToasts = [];
      else defaultRequiredToasts.push(notify.error(err));
    }
  );


};
