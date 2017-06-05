import _ from 'lodash';
import toPath from 'lodash/internal/toPath';

export function unset(object, rawPath) {
  if (!object) return;
  const path = toPath(rawPath);

  switch (path.length) {
    case 0:
      return;

    case 1:
      delete object[rawPath];
      break;

    default:
      const leaf = path.pop();
      const parentPath = path.slice();
      const parent = _.get(object, parentPath);
      unset(parent, leaf);
      if (!_.size(parent)) {
        unset(object, parentPath);
      }
      break;
  }
}
