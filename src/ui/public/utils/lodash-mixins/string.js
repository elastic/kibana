export function lodashStringMixin(_) {
  _.mixin({

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
