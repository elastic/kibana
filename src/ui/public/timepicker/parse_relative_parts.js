import dateMath from '@elastic/datemath';
import moment from 'moment';
import _ from 'lodash';
import { relativeOptions } from './relative_options';

export function parseRelativeString(part) {
  const results = {};
  const parts = part.toString().split('-');
  let relativeParts = [];

  if (parts[0] === 'now' && !parts[1]) {
    return { count: 0, unit: 's', round: false };
  }

  if (parts[0] === 'now' && parts[1]) {
    relativeParts = parts[1].match(/([0-9]+)([smhdwMy]).*/);
  }

  if (relativeParts[1] && relativeParts[2]) {
    results.count = parseInt(relativeParts[1], 10);
    results.unit = relativeParts[2];
    results.round = (part.toString().split('/')[1]) ? true : false;
    return results;

  } else {
    const duration = moment.duration(moment().diff(dateMath.parse(part)));
    const units = _.pluck(_.clone(relativeOptions).reverse(), 'value');
    for (let i = 0; i < units.length; i++) {
      const as = duration.as(units[i]);
      if (as > 1) {
        results.count = Math.round(as);
        results.unit = units[i];
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
  if (/now/.test(to)) {
    results.to = parseRelativeString(to);
  } else {
    results.to = parseRelativeString('now');
  }
  if (results.from && results.to) return results;
}
