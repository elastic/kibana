import _ from 'lodash';

export function keysToSnakeCaseShallow(object) {
  return _.mapKeys(object, (value, key) => {
    return _.snakeCase(key);
  });
}

export function keysToCamelCaseShallow(object) {
  return _.mapKeys(object, (value, key) => {
    return _.camelCase(key);
  });
}
