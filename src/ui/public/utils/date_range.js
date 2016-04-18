define(function (require) {
  let moment = require('moment');

  return {
    toString: function (range, format) {
      if (!range.from) {
        return 'Before ' + format(range.to);
      } else if (!range.to) {
        return 'After ' + format(range.from);
      } else {
        return format(range.from) + ' to ' + format(range.to);
      }
    },
    parse: function (rangeString, format) {
      let chunks = rangeString.split(' to ');
      if (chunks.length === 2) return {from: moment(chunks[0], format), to: moment(chunks[1], format)};

      chunks = rangeString.split('Before ');
      if (chunks.length === 2) return {to: moment(chunks[1], format)};

      chunks = rangeString.split('After ');
      if (chunks.length === 2) return {from: moment(chunks[1], format)};

      throw new Error('Error attempting to parse date range: ' + rangeString);
    }
  };
});
