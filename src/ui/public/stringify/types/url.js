import _ from 'lodash';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';
import { getHighlightHtml } from 'ui/highlight';

export function stringifyUrl() {
  _.class(Url).inherits(FieldFormat);
  function Url(params) {
    Url.Super.call(this, params);
    this._compileTemplate = _.memoize(this._compileTemplate);
  }

  Url.id = 'url';
  Url.title = 'Url';
  Url.fieldType = [
    'number',
    'boolean',
    'date',
    'ip',
    'string',
    'murmur3',
    'unknown',
    'conflict'
  ];

  Url.templateMatchRE = /{{([\s\S]+?)}}/g;

  Url.prototype.getParamDefaults = function () {
    return {
      type: 'a',
      urlTemplate: null,
      labelTemplate: null
    };
  };

  Url.prototype._formatUrl = function (value) {
    const template = this.param('urlTemplate');
    if (!template) return value;

    return this._compileTemplate(template)({
      value: encodeURIComponent(value),
      rawValue: value
    });
  };

  Url.prototype._formatLabel = function (value, url) {
    const template = this.param('labelTemplate');
    if (url == null) url = this._formatUrl(value);
    if (!template) return url;

    return this._compileTemplate(template)({
      value: value,
      url: url
    });
  };

  Url.prototype._convert = {
    text: function (value) {
      return this._formatLabel(value);
    },

    html: function (rawValue, field, hit) {
      const url = _.escape(this._formatUrl(rawValue));
      const label = _.escape(this._formatLabel(rawValue, url));

      switch (this.param('type')) {
        case 'img':
          // If the URL hasn't been formatted to become a meaningful label then the best we can do
          // is tell screen readers where the image comes from.
          const imageLabel =
            label === url
            ? `A dynamically-specified image located at ${url}`
            : label;

          return `<img src="${url}" alt="${imageLabel}">`;
        default:
          let linkLabel;

          if (hit && hit.highlight && hit.highlight[field.name]) {
            linkLabel = getHighlightHtml(label, hit.highlight[field.name]);
          } else {
            linkLabel = label;
          }

          return `<a href="${url}" target="_blank">${linkLabel}</a>`;
      }
    }
  };

  Url.prototype._compileTemplate = function (template) {
    const parts = template.split(Url.templateMatchRE).map(function (part, i) {
      // trim all the odd bits, the variable names
      return (i % 2) ? part.trim() : part;
    });

    return function (locals) {
      // replace all the odd bits with their local var
      let output = '';
      let i = -1;
      while (++i < parts.length) {
        if (i % 2) {
          if (locals.hasOwnProperty(parts[i])) {
            const local = locals[parts[i]];
            output += local == null ? '' : local;
          }
        } else {
          output += parts[i];
        }
      }

      return output;
    };
  };

  return Url;
}
