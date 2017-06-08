import _ from 'lodash';
import { Notifier } from 'ui/notify/notifier';
import { NoDefaultIndexPattern } from 'ui/errors';
import { IndexPatternsGetIdsProvider } from '../_get_ids';
import uiRoutes from 'ui/routes';
const notify = new Notifier({
  location: 'Index Patterns'
});

module.exports = function (opts) {
  opts = opts || {};
  const whenMissingRedirectTo = opts.whenMissingRedirectTo || null;
  let defaultRequiredToasts = null;

  uiRoutes
  .addSetupWork(function loadDefaultIndexPattern(Private, Promise, $route, config) {
    const getIds = Private(IndexPatternsGetIdsProvider);
    const route = _.get($route, 'current.$$route');

    return getIds()
    .then(function (patterns) {
      let defaultId = config.get('defaultIndex');
      let defined = !!defaultId;
      const exists = _.contains(patterns, defaultId);

      if (defined && !exists) {
        config.remove('defaultIndex');
        defaultId = defined = false;
      }

      if (!defined && route.requireDefaultIndex) {
        // If there is only one index pattern, set it as default
        if (patterns.length === 1) {
          defaultId = patterns[0];
          config.set('defaultIndex', defaultId);
        } else {
          throw new NoDefaultIndexPattern();
        }
      }
    });
  })
  .afterWork(
    // success
    null,

    // failure
    function (err, kbnUrl) {
      const hasDefault = !(err instanceof NoDefaultIndexPattern);
      if (hasDefault || !whenMissingRedirectTo) throw err; // rethrow

      kbnUrl.change(whenMissingRedirectTo);
      if (!defaultRequiredToasts) defaultRequiredToasts = [];
      else defaultRequiredToasts.push(notify.error(err));
    }
  );


};
