import _ from 'lodash';
import { shortenDottedString } from '../../../core_plugins/kibana/common/utils/shorten_dotted_string';
import { uiModules } from '../modules';
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
    filter = enabled ? shortenDottedString : _.identity;
  }
  function wrapper(str) {
    return filter(str);
  }
}
