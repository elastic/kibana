// Shorts dot notated strings
// eg: foo.bar.baz becomes f.b.baz
// 'foo.bar.baz'.replace(/(.+?\.)/g,function(v) {return v[0]+'.';});
define(function (require) {
  let _ = require('lodash');

  require('ui/modules')
    .get('kibana')
    .filter('shortDots', function (Private) {
      return Private(shortDotsFilterProvider);
    });

  function shortDotsFilterProvider(config, $rootScope) {
    let filter;

    function updateFilter() {
      filter = config.get('shortDots:enable') ? _.shortenDottedString : _.identity;
    }

    updateFilter();
    $rootScope.$on('change:config.shortDots:enable', updateFilter);
    $rootScope.$on('init:config', updateFilter);

    return function (str) {
      return filter(str);
    };
  }

  return shortDotsFilterProvider;
});
