define(function (require) {
  return function _SourceProvider(Private, shortDotsFilter) {
    let _ = require('lodash');
    let FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
    let noWhiteSpace = require('ui/utils/no_white_space');
    let template = _.template(noWhiteSpace(require('ui/stringify/types/_source.html')));
    let angular = require('angular');

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

        let highlights = (hit && hit.highlight) || {};
        let formatted = field.indexPattern.formatHit(hit);
        let highlightPairs = [];
        let sourcePairs = [];

        _.keys(formatted).forEach(function (key) {
          let pairs = highlights[key] ? highlightPairs : sourcePairs;
          let field = shortDotsFilter(key);
          let val = formatted[key];
          pairs.push([field, val]);
        }, []);

        return template({ defPairs: highlightPairs.concat(sourcePairs) });
      }
    };

    return Source;
  };
});
