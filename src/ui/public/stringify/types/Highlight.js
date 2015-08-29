define(function (require) {
  return function HighlightFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
    _.class(Highlight).inherits(FieldFormat);
    function Highlight(params) {
      Highlight.Super.call(this, params);
    }
    Highlight.id = 'highlight';
    Highlight.title = 'Highlight';
    Highlight.fieldType = ['string'];
    Highlight.prototype._convert = {
      text: _.escape,
      html: _.escape
    };
    return Highlight;
  };
});
Highlight.editor = require('ui/stringify/editors/highlight.html');
Highlight.prototype._highlight = function (val, replace) {
  var escapedVal = _.escape(val);
  var highlightPattern;
  try {
    var inputRegex = this.param('pattern').split('/');
    var pattern = inputRegex[0] || inputRegex[1];
    var flags = inputRegex[2];
    highlightPattern = new RegExp(pattern, flags);
  } catch(e) {
    return escapedVal;
  }
  return escapedVal.replace(highlightPattern, replace);
};