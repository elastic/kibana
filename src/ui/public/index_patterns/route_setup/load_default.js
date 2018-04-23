import _ from 'lodash';
import React from 'react';
import { banners } from '../../notify';
import { NoDefaultIndexPattern } from '../../errors';
import { IndexPatternsGetProvider } from '../_get';
import uiRoutes from '../../routes';
import {
  EuiCallOut,
} from '@elastic/eui';
import { clearTimeout } from 'timers';

let bannerId;
let timeoutId;

function displayBanner() {
  clearTimeout(timeoutId);

  // Avoid being hostile to new users who don't have an index pattern setup yet
  // give them a friendly info message instead of a terse error message
  bannerId = banners.set({
    id: bannerId, // initially undefined, but reused after first set
    component: (
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title={
          `In order to visualize and explore data in Kibana,
          you'll need to create an index pattern to retrieve data from Elasticsearch.`
        }
      />
    )
  });

  // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
  timeoutId = setTimeout(() => {
    banners.remove(bannerId);
    timeoutId = undefined;
  }, 15000);
}

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

        displayBanner();
      }
    );
}
