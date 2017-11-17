import _ from 'lodash';
import { Notifier } from 'ui/notify/notifier';
import { NoDefaultIndexPattern } from 'ui/errors';
import { IndexPatternsGetProvider } from '../_get';
import uiRoutes from 'ui/routes';
const notify = new Notifier({
  location: 'Index Patterns'
});

const NO_DEFAULT_INDEX_PATTERN_MSG = `
In order to visualize and explore data in Kibana,
you'll need to create an index pattern to retrieve data from Elasticsearch.
`;

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function (opts) {
  opts = opts || {};
  const whenMissingRedirectTo = opts.whenMissingRedirectTo || null;

  uiRoutes
    .addSetupWork(function loadDefaultIndexPattern(Private, Promise, $route, config) {
      const getIds = Private(IndexPatternsGetProvider)('id');
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

        // Avoid being hostile to new users who don't have an index pattern setup yet
        // give them a friendly info message instead of a terse error message
        notify.info(NO_DEFAULT_INDEX_PATTERN_MSG, { lifetime: 15000 });
      }
    );
}
