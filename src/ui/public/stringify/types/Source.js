import _ from 'lodash';
import noWhiteSpace from 'ui/utils/no_white_space';
import angular from 'angular';
import IndexPatternsFieldFormatFieldFormatProvider from 'ui/index_patterns/_field_format/FieldFormat';
export default function _SourceProvider(Private, shortDotsFilter) {
  var FieldFormat = Private(IndexPatternsFieldFormatFieldFormatProvider);
  var template = _.template(noWhiteSpace(require('ui/stringify/types/_source.html')));

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
      if (!field) return this.getConverter('text')(source, field, hit);

      var highlights = (hit && hit.highlight) || {};
      var formatted = field.indexPattern.formatHit(hit);
      var highlightPairs = [];
      var sourcePairs = [];

      _.keys(formatted).forEach(function (key) {
        var pairs = highlights[key] ? highlightPairs : sourcePairs;
        var field = shortDotsFilter(key);
        var val = formatted[key];
        pairs.push([field, val]);
      }, []);

      return template({ defPairs: highlightPairs.concat(sourcePairs) });
    }
  };

  return Source;
};
