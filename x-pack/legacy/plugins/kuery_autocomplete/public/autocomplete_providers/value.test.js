/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestionsProvider } from './value';
import indexPatternResponse from './__fixtures__/index_pattern_response.json';

import { npStart } from 'ui/new_platform';

jest.mock('ui/new_platform', () => ({
  npStart: {
    plugins: {
      data: {
        getSuggestions: (_, field) => {
          let res;
          if (field.type === 'boolean') {
            res = [true, false];
          } else if (field.name === 'machine.os') {
            res = ['Windo"ws', 'Mac\'', 'Linux'];
          }
          else if (field.name === 'nestedField.child') {
            res = ['foo'];
          }
          else {
            res = [];
          }
          return Promise.resolve(res);
        }
      },
    }
  }
}));


describe('Kuery value suggestions', function () {
  let indexPatterns;
  let getSuggestions;

  beforeEach(() => {
    indexPatterns = [indexPatternResponse];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
    jest.clearAllMocks();
  });

  test('should return a function', function () {
    expect(typeof getSuggestions).toBe('function');
  });

  test('should not search for non existing field', async () => {
    const fieldName = 'i_dont_exist';
    const prefix = '';
    const suffix = '';
    const spy = jest.spyOn(npStart.plugins.data, 'getSuggestions');
    const suggestions = await getSuggestions({ fieldName, prefix, suffix });
    expect(suggestions.map(({ text }) => text)).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(0);
  });


  test('should format suggestions', async () => {
    const fieldName = 'ssl'; // Has results with quotes in mock
    const prefix = '';
    const suffix = '';
    const start = 1;
    const end = 5;
    const suggestions = await getSuggestions({ fieldName, prefix, suffix, start, end });
    expect(suggestions[0].type).toEqual('value');
    expect(suggestions[0].start).toEqual(start);
    expect(suggestions[0].end).toEqual(end);
  });

  test('should handle nested paths', async () => {
    const suggestions = await getSuggestions({
      fieldName: 'child',
      nestedPath: 'nestedField',
      prefix: '',
      suffix: '',
    });
    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].text).toEqual('"foo" ');
  });

  describe('Boolean suggestions', function () {
    test('should stringify boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const spy = jest.spyOn(npStart.plugins.data, 'getSuggestions');
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).toEqual(['true ', 'false ']);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('should filter out boolean suggestions', async () => {
      const fieldName = 'ssl'; // Has results with quotes in mock
      const prefix = 'fa';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.length).toEqual(1);
    });

  });


  describe('String suggestions', function () {
    test('should merge prefix and suffix', async () => {
      const fieldName = 'machine.os.raw';
      const prefix = 'he';
      const suffix = 'llo';
      const spy = jest.spyOn(npStart.plugins.data, 'getSuggestions');
      await getSuggestions({ fieldName, prefix, suffix });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toBeCalledWith(expect.any(String), expect.any(Object), prefix + suffix, undefined, undefined);
    });

    test('should escape quotes in suggestions', async () => {
      const fieldName = 'machine.os'; // Has results with quotes in mock
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions[0].text).toEqual('"Windo\\"ws" ');
      expect(suggestions[1].text).toEqual('"Mac\'" ');
      expect(suggestions[2].text).toEqual('"Linux" ');
    });

    test('should filter out string suggestions', async () => {
      const fieldName = 'machine.os'; // Has results with quotes in mock
      const prefix = 'banana';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.length).toEqual(0);
    });

    test('should partially filter out string suggestions - case insensitive', async () => {
      const fieldName = 'machine.os'; // Has results with quotes in mock
      const prefix = 'ma';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.length).toEqual(1);
    });
  });


});
