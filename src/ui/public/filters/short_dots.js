import _ from 'lodash';
import uiModules from 'ui/modules';
// Shorts dot notated strings
// eg: foo.bar.baz becomes f.b.baz
// 'foo.bar.baz'.replace(/(.+?\.)/g,function(v) {return v[0]+'.';});

uiModules
  .get('kibana')
  .filter('shortDots', function (Private) {
    return Private(shortDotsFilterProvider);
  });

function shortDotsFilterProvider(config) {
  let filter;

  config.watch('shortDots:enable', updateFilter);

  return wrapper;

  function updateFilter(enabled) {
    filter = enabled ? _.shortenDottedString : _.identity;
  }
  function wrapper(str) {
    return filter(str);
  }
}

export default shortDotsFilterProvider;
