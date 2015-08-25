define(function (require) {
  return function (_) {

    var DOT_PREFIX_RE = /(.).+?\./g;

    _.mixin({

      /**
       * Convert a value to a presentable string
       * @param  {any} val - the value to transform
       * @return {string}
       */
      asPrettyString: function (val) {
        if (val === null || val === undefined) return ' - ';
        switch (typeof val) {
          case 'string': return val;
          case 'object': return JSON.stringify(val, null, '  ');
          default: return '' + val;
        }
      },

      /**
       * Convert a dot.notated.string into a short
       * version (d.n.string)
       *
       * @param {string} str - the long string to convert
       * @return {string}
       */
      shortenDottedString: function (input) {
        return typeof input !== 'string' ? input : input.replace(DOT_PREFIX_RE, '$1.');
      },

      /**
       * Parse a comma-seperated list into an array
       * efficiently, or just return if already an array
       *
       * @param {string|array} input  - the comma-seperated list
       * @return {array}
       */
      commaSeperatedList: function (input) {
        if (_.isArray(input)) return input;

        var source = String(input || '').split(',');
        var list = [];
        while (source.length) {
          var item = source.shift().trim();
          if (item) list.push(item);
        }

        return list;
      },

      /**
       * Converts `value` to property path array if it's not one.
       * This is a stop-gap until we have access to the npm version of lodash
       * and gain access to `lodash/internal/toPath`
       *
       * @param {*} value The value to process.
       * @returns {Array} Returns the property path array.
       */
      toPath: function (value) {
        var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;
        var reEscapeChar = /\\(\\)?/g;

        function baseToString(value) {
          return value == null ? '' : (value + '');
        }

        if (_.isArray(value)) {
          return value;
        }
        var result = [];
        baseToString(value).replace(rePropName, function (match, number, quote, string) {
          result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
        });
        return result;
      }

    });
  };
});
