define(function (require) {
  let _ = require('lodash');
  let moment = require('moment');

  let units = ['y', 'M', 'w', 'd', 'h', 'm', 's'];
  let unitsAsc = _.sortBy(units, function (unit) {
    return moment.duration(1, unit).valueOf();
  });
  let unitsDesc = unitsAsc.reverse();

  /* This is a simplified version of elasticsearch's date parser */
  function parse(text, roundUp) {
    if (!text) return undefined;
    if (moment.isMoment(text)) return text;
    if (_.isDate(text)) return moment(text);

    let time;
    let mathString = '';
    let index;
    let parseString;

    if (text.substring(0, 3) === 'now') {
      time = moment();
      mathString = text.substring('now'.length);
    } else {
      index = text.indexOf('||');
      if (index === -1) {
        parseString = text;
        mathString = ''; // nothing else
      } else {
        parseString = text.substring(0, index);
        mathString = text.substring(index + 2);
      }
      // We're going to just require ISO8601 timestamps, k?
      time = moment(parseString);
    }

    if (!mathString.length) {
      return time;
    }

    return parseDateMath(mathString, time, roundUp);
  }

  function parseDateMath(mathString, time, roundUp) {
    let dateTime = time;
    let i = 0;
    let len = mathString.length;

    while (i < len) {
      let c = mathString.charAt(i++);
      let type;
      let num;
      let unit;

      if (c === '/') {
        type = 0;
      } else if (c === '+') {
        type = 1;
      } else if (c === '-') {
        type = 2;
      } else {
        return undefined;
      }

      if (isNaN(mathString.charAt(i))) {
        num = 1;
      } else if (mathString.length === 2) {
        num = mathString.charAt(i);
      } else {
        let numFrom = i;
        while (!isNaN(mathString.charAt(i))) {
          i++;
          if (i > 10) return undefined;
        }
        num = parseInt(mathString.substring(numFrom, i), 10);
      }

      if (type === 0) {
        // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
        if (num !== 1) {
          return undefined;
        }
      }
      unit = mathString.charAt(i++);

      if (!_.contains(units, unit)) {
        return undefined;
      } else {
        if (type === 0) {
          if (roundUp) dateTime.endOf(unit);
          else dateTime.startOf(unit);
        } else if (type === 1) {
          dateTime.add(num, unit);
        } else if (type === 2) {
          dateTime.subtract(num, unit);
        }
      }
    }
    return dateTime;
  }

  return {
    parse: parse,

    units: Object.freeze(units),
    unitsAsc: Object.freeze(unitsAsc),
    unitsDesc: Object.freeze(unitsDesc)
  };
});
