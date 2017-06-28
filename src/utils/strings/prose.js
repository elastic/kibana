import _ from 'lodash';

export function formatListAsProse(list, options = {}) {
  const {
    inclusive = true
  } = options;

  if (!Array.isArray(list)) {
    return String(list);
  }

  if (list.length < 2) {
    return list.join('');
  }

  const conj = inclusive ? ' and ' : ' or ';
  return list.slice(0, -1).join(', ') + conj + _.last(list);
}
