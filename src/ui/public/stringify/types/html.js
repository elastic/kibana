define(function (require) {
  return function HtmlFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));

    _.class(Html).inherits(FieldFormat);
    function Html(params) {
      Html.Super.call(this, params);
      this._compileTemplate = _.memoize(this._compileTemplate);
    }

    Html.id = 'html';
    Html.title = 'HTML';
    Html.fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];

    Html.prototype._format = function (value) {
      var template = this.param('pattern');
      if (!template) return value;

      return this._compileTemplate(template)({
        value: _.escape(encodeURIComponent(value)),
        rawValue: _.escape(value)
      });
    };

    Html.prototype._convert = {
      text: _.escape,
      html: function (val) {
        return this._format(val);
      }
    };

    Html.templateMatchRE = /{{([\s\S]+?)}}/g;

    Html.editor = require('ui/stringify/editors/html.html');

    Html.prototype._compileTemplate = function (template) {
      var parts = template.split(Html.templateMatchRE).map(function (part, i) {
        // trim all the odd bits, the variable names
        return (i % 2) ? part.trim() : part;
      });

      return function (locals) {
        // replace all the odd bits with their local var
        var output = '';
        var i = -1;
        while (++i < parts.length) {
          if (i % 2) {
            if (locals.hasOwnProperty(parts[i])) {
              var local = locals[parts[i]];
              output += local == null ? '' : local;
            }
          } else {
            output += parts[i];
          }
        }

        return output;
      };
    };

    return Html;
  };
});
