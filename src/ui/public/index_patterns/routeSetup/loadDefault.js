define(function (require) {
  let _ = require('lodash');
  let { NoDefaultIndexPattern, NoDefinedIndexPatterns } = require('ui/errors');
  let Notifier = require('ui/notify/Notifier');
  let notify = new Notifier({
    location: 'Index Patterns'
  });

  let defaultRequiredToasts = null;

  require('ui/routes')
  .afterWork(
    // success
    function () {
      if (defaultRequiredToasts) {
        _.invoke(defaultRequiredToasts, 'clear');
        defaultRequiredToasts = null;
      }
    },

    // failure
    function (err, kbnUrl) {
      let hasDefault = !(err instanceof NoDefaultIndexPattern);
      if (hasDefault) throw err; // rethrow

      kbnUrl.change('/settings/indices');
      if (!defaultRequiredToasts) defaultRequiredToasts = [];
      else defaultRequiredToasts.push(notify.error(err));
    }
  );

  return function makeIndexPatternLoadDefaultRouteSetup(opts) {
    opts = opts || {};
    var notRequiredRe = opts.notRequiredRe || null;

    return function loadDefault(Private, Promise, $route, config, indexPatterns) {
      let getIds = Private(require('../_get_ids'));
      var rootSearchSource = Private(require('ui/courier/data_source/_root_search_source'));
      var path = _.get($route, 'current.$$route.originalPath');

      return config.init()
      .then(function () {
        return getIds();
      })
      .then(function (patterns) {
        let defaultId = config.get('defaultIndex');
        let defined = !!defaultId;
        let exists = _.contains(patterns, defaultId);
        let required = !notRequiredRe || !path.match(notRequiredRe);

        if (defined && !exists) {
          config.clear('defaultIndex');
          defaultId = defined = false;
        }

        if (!defined && required) {
          throw new NoDefaultIndexPattern();
        }

        return notify.event('loading default index pattern', function () {
          return indexPatterns.get(defaultId).then(function (pattern) {
            rootSearchSource.getGlobalSource().set('index', pattern);
            notify.log('index pattern set to', defaultId);
          });
        });
      });
    };
  };
});
