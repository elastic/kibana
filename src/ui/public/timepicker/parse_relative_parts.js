import dateMath from '@elastic/datemath';
import moment from 'moment';
import _ from 'lodash';
import { relativeOptions } from './relative_options';

export function parseRelativeString(part) {
  let results = {};
  const matches = _.isString(part) && part.match(/now(([\-\+])([0-9]+)([smhdwMy])(\/[smhdwMy])?)?/);

  if (matches && !matches[1]) {
    return { count: 0, unit: 's', round: false };
  }

  if (matches && matches[3] && matches[4]) {
    results.count = parseInt(matches[3], 10);
    results.unit = matches[4];
    if (matches[2] === '+') results.unit += '+';
    results.round = matches[5] ? true : false;
    return results;

  } else {
    results = { count: 0, unit: 's', round: false };
    const duration = moment.duration(moment().diff(dateMath.parse(part)));
    const units = _.pluck(_.clone(relativeOptions).reverse(), 'value')
      .filter(s => /^[smhdwMy]$/.test(s));
    let unitOp = '';
    for (let i = 0; i < units.length; i++) {
      const as = duration.as(units[i]);
      if (as < 0) unitOp = '+';
      if (Math.abs(as) > 1) {
        results.count = Math.round(Math.abs(as));
        results.unit = units[i] + unitOp;
        results.round = false;
        break;
      }
    }
    return results;
  }


}

export function parseRelativeParts(from, to) {
  const results = {};
  results.from = parseRelativeString(from);
  results.to = parseRelativeString(to);
  if (results.from && results.to) return results;
}
