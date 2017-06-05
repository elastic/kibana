import expect from 'expect.js';
import _ from 'lodash';
import { keysToSnakeCaseShallow, keysToCamelCaseShallow } from '../case_conversion';

describe('keysToSnakeCaseShallow', function () {

  it('should convert all of an object\'s keys to snake case', function () {
    const result = keysToSnakeCaseShallow({
      camelCase: 'camel_case',
      'kebab-case': 'kebab_case',
      snake_case: 'snake_case'
    });

    _.forEach(result, function (value, key) {
      expect(key).to.be(value);
    });
  });

});

describe('keysToCamelCaseShallow', function () {

  it('should convert all of an object\'s keys to camel case', function () {
    const result = keysToCamelCaseShallow({
      camelCase: 'camelCase',
      'kebab-case': 'kebabCase',
      snake_case: 'snakeCase'
    });

    _.forEach(result, function (value, key) {
      expect(key).to.be(value);
    });
  });

});
