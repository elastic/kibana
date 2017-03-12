import _ from 'lodash';
import noWhiteSpace from 'ui/utils/no_white_space';
import angular from 'angular';
import IndexPatternsFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
export default function _SourceFormatProvider(Private, shortDotsFilter) {
  const FieldFormat = Private(IndexPatternsFieldFormatProvider);
  const template = _.template(noWhiteSpace(require('ui/stringify/types/_source.html')));

  _.class(Source).inherits(FieldFormat);
  function Source(params) {
    Source.Super.call(this, params);
  }

  Source.id = '_source';
  Source.title = '_source';
  Source.fieldType = '_source';

  Source.prototype._convert = {
    text: angular.toJson,
    html: function sourceToHtml(source, field, hit) {
      if (!field) return this.getConverterFor('text')(source, field, hit);

      const highlights = (hit && hit.highlight) || {};
      const formatted = field.indexPattern.formatHit(hit);
      const highlightPairs = [];
      const sourcePairs = [];

      _.keys(formatted).forEach(function (key) {
        const pairs = highlights[key] ? highlightPairs : sourcePairs;
        const field = shortDotsFilter(key);
        const val = formatted[key];
        pairs.push([field, val]);
      }, []);

      return template({ defPairs: highlightPairs.concat(sourcePairs) });
    }
  };

  return Source;
}
