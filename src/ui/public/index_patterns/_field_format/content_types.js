import _ from 'lodash';
import { getHighlightHtml } from 'ui/highlight';

const types = {
  html: function (format, convert) {
    function recurse(value, field, hit) {
      if (value == null) {
        return _.asPrettyString(value);
      }

      if (!value || typeof value.map !== 'function') {
        return convert.call(format, value, field, hit);
      }

      const subVals = value.map(v => {
        return recurse(v, field, hit);
      });
      const useMultiLine = subVals.some(sub => {
        return sub.indexOf('\n') > -1;
      });

      return subVals.join(',' + (useMultiLine ? '\n' : ' '));
    }

    return function (...args) {
      return `<span ng-non-bindable>${recurse(...args)}</span>`;
    };
  },

  text: function (format, convert) {
    return function recurse(value) {
      if (!value || typeof value.map !== 'function') {
        return convert.call(format, value);
      }

      // format a list of values. In text contexts we just use JSON encoding
      return JSON.stringify(value.map(recurse));
    };
  }
};

function fallbackText(value) {
  return _.asPrettyString(value);
}

function fallbackHtml(value, field, hit) {
  const formatted = _.escape(this.convert(value, 'text'));

  if (!hit || !hit.highlight || !hit.highlight[field.name]) {
    return formatted;
  } else {
    return getHighlightHtml(formatted, hit.highlight[field.name]);
  }
}

function setup(format) {
  const src = format._convert || {};
  const converters = format._convert = {};

  converters.text = types.text(format, src.text || fallbackText);
  converters.html = types.html(format, src.html || fallbackHtml);

  return format._convert;
}

export const contentTypes = {
  types: types,
  setup: setup
};
