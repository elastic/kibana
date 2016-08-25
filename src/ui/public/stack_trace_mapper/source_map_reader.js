import _ from 'lodash';
import { SourceMapConsumer } from 'source-map/lib/source-map-consumer';
import { parse } from 'url';

function SourceMapReader(url, map) {
  this.smc = new SourceMapConsumer(map);
  this.url = parse(url);
  this.re = new RegExp('(^|/)' + _.escapeRegExp(this.url.pathname.slice(1)) + '($|\\?|#)');
}

SourceMapReader.prototype.matchUrl = function (stackFileName) {
  return this.re.test(stackFileName);
};

module.exports = SourceMapReader;
