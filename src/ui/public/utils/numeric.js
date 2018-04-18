import _ from 'lodash';

export function isNumeric(v) {
  return !_.isNaN(v) && (typeof v === 'number' || (!Array.isArray(v) && !_.isNaN(parseFloat(v))));
}
