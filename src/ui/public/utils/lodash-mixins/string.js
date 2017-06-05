export function lodashStringMixin(_) {

  const DOT_PREFIX_RE = /(.).+?\./g;

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

      const source = String(input || '').split(',');
      const list = [];
      while (source.length) {
        const item = source.shift().trim();
        if (item) list.push(item);
      }

      return list;
    }

  });
}
