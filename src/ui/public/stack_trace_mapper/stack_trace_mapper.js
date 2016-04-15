import _ from 'lodash';
import fetch from 'exports?window.fetch!imports?Promise=bluebird!whatwg-fetch';

import setErrorStack from './set_error_stack';
import translateStackLine from './translate_stack_line';
import stackLineFormat from './stack_line_format';
import SourceMapReader from './source_map_reader';
import { resolve } from 'bluebird';
import $ from 'jquery';

function StackTraceMapper() {
  this.maps = [];
  this.init = _.once(this.init);
  this.getMapFor = _.memoize(this.getMapFor);
  _.bindAll(this, 'init', 'mapError', 'getMapFor', 'mapLine', 'loadMaps');
}

StackTraceMapper.prototype.init = function (mapUrls) {
  return this.loadMaps(mapUrls).return(this);
};

StackTraceMapper.prototype.mapError = function (err) {
  if (!stackLineFormat || !err.stack) return err;

  let stack = err.stack.replace(stackLineFormat, this.mapLine);
  return setErrorStack(err, stack);
};

StackTraceMapper.prototype.mapLine = function (match, filename, line, col) {
  return translateStackLine(this.getMapFor(filename), match, filename, line, col);
};

StackTraceMapper.prototype.getMapFor = function (url) {
  return _.find(this.maps, function (map) {
    return map.matchUrl(url);
  });
};

StackTraceMapper.prototype.loadMaps = function (mapUrls) {
  mapUrls = _.clone(mapUrls || {});

  let maps = this.maps;

  $('script[src][src-map]').each(function () {
    let $el = $(this);
    mapUrls[$el.attr('src')] = $el.attr('src-map');
  });

  return resolve(_.pairs(mapUrls))
  .map(
    _.spread(function (url, mapUrl) {
      return fetch(mapUrl)
      .then(function (resp) { return resp.json(); })
      .then(function (map) {
        maps.push(new SourceMapReader(url, map));
      });
    })
  );
};

StackTraceMapper.getInstance = _.once(function () {
  return (new StackTraceMapper()).init();
});

module.exports = StackTraceMapper;
