/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  upperBoundForColumnCount,
  generateColumnNames,
  columnsFromHeader,
  totalColumnCount,
  toSafeColumnName,
  yieldUniqueColumnNames,
} from './columns';

describe('upperBoundForColumnCount', () => {
  it('should return the correct number of columns for a simple CSV', () => {
    const samples = ['name,age,location', 'john,30,new york', 'jane,25,los angeles'];
    expect(upperBoundForColumnCount(samples)).toBe(3);
  });

  it('should handle samples with varying column counts', () => {
    const samples = ['name,age,location', 'john,30', 'jane,25,los angeles,usa'];
    expect(upperBoundForColumnCount(samples)).toBe(4);
  });

  it('should return 0 for empty samples', () => {
    const samples: string[] = [];
    expect(upperBoundForColumnCount(samples)).toBe(0);
  });

  it('should handle samples with empty strings', () => {
    const samples = ['', 'john,30,new york', 'jane,25,los angeles'];
    expect(upperBoundForColumnCount(samples)).toBe(3);
  });

  it('should handle samples with only one column', () => {
    const samples = ['name', 'john', 'jane'];
    expect(upperBoundForColumnCount(samples)).toBe(1);
  });

  it('should handle samples with extra commas', () => {
    const samples = ['name,age,location', 'john,30', 'jane,25,"los angeles,usa"'];
    expect(upperBoundForColumnCount(samples)).toBeGreaterThanOrEqual(3);
  });
});

describe('generateColumnNames', () => {
  it('should generate the correct number of column names', () => {
    const count = 5;
    const expected = ['column1', 'column2', 'column3', 'column4', 'column5'];
    expect(generateColumnNames(count)).toEqual(expected);
  });

  it('should return an empty array when count is 0', () => {
    const count = 0;
    const expected: string[] = [];
    expect(generateColumnNames(count)).toEqual(expected);
  });

  it('should handle large counts correctly', () => {
    const count = 100;
    const result = generateColumnNames(count);
    expect(result.length).toBe(count);
    expect(result[0]).toBe('column1');
    expect(result[count - 1]).toBe('column100');
  });
});

describe('columnsFromHeader', () => {
  it('should return the correct columns from the header object', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const headerObject = { column1: 'name', column2: 'age', column3: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual(['name', 'age', 'location']);
  });

  it('should return an empty array if no columns match', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const headerObject = { column4: 'name', column5: 'age', column6: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });

  it('should handle missing columns in the header object', () => {
    const tempColumnNames = ['column1', 'column2', 'column3', 'column4'];
    const headerObject = { column1: 'name', column3: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([
      'name',
      undefined,
      'location',
    ]);
  });

  it('should handle an empty header object', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const headerObject = {};
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });

  it('should handle an empty tempColumnNames array', () => {
    const tempColumnNames: string[] = [];
    const headerObject = { column1: 'name', column2: 'age', column3: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });
});

describe('totalColumnCount', () => {
  it('should return the correct total column count for a simple CSV', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const csvRows = [
      { column1: 'john', column2: '30', column3: 'new york' },
      { column1: 'jane', column3: '25', column4: 'los angeles' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });

  it('should handle rows with varying column counts', () => {
    const tempColumnNames = ['column1', 'column2', 'column3', 'column4'];
    const csvRows = [
      { column1: 'john', column2: '30' },
      { column1: 'jane', column3: 'los angeles', column4: 'usa' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(4);
  });

  it('should return 0 for empty rows', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    expect(totalColumnCount(tempColumnNames, [])).toBe(0);
  });

  it('should handle rows with empty objects', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const csvRows = [
      {},
      { column1: 'john', column2: '30', column3: 'new york' },
      { column1: 'jane', column2: '25', column3: 'los angeles' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });

  it('should handle rows with only one column', () => {
    const tempColumnNames = ['column1'];
    const csvRows = [{ column1: 'john' }, { column1: 'jane' }];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(1);
  });

  it('should handle rows with extra columns', () => {
    const tempColumnNames = ['column1', 'column2', 'column3'];
    const csvRows = [
      { column1: 'john', column2: '30' },
      { column1: 'jane', column2: '25', column3: 'los angeles', column4: 'usa' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });

  describe('toSafeColumnName', () => {
    it('should return undefined for non-string and non-number inputs', () => {
      expect(toSafeColumnName(null)).toBeUndefined();
      expect(toSafeColumnName(undefined)).toBeUndefined();
      expect(toSafeColumnName({})).toBeUndefined();
      expect(toSafeColumnName([1, 2])).toBeUndefined();
    });

    it('should replace non-alphanumeric characters with underscores', () => {
      expect(toSafeColumnName('name@age!location')).toBe('name_age_location');
      expect(toSafeColumnName('column#1')).toBe('column_1');
    });

    it('should return the same string if it contains only alphanumeric characters and underscores', () => {
      expect(toSafeColumnName('Column1')).toBe('Column1');
      expect(toSafeColumnName('Location')).toBe('Location');
    });

    it('should handle empty strings', () => {
      expect(toSafeColumnName('')).toBeUndefined();
    });

    it('should handle strings starting from a digit or numbers', () => {
      expect(toSafeColumnName('1ABC')).toBe('Column1ABC');
      expect(toSafeColumnName(123)).toBe('Column123');
    });
  });
});

describe('yieldUniqueColumnNames', () => {
  it('should yield unique column names based on preferred and fallback names', () => {
    const count = 5;
    const preferredNames = [
      ['name1', 'name2', undefined, 'name4', undefined],
      [undefined, 'altName2', 'altName3', undefined, 'altName5'],
    ];
    const fallbackNames = ['fallback1', 'fallback2', 'fallback3', 'fallback4', 'fallback5'];

    const result = Array.from(yieldUniqueColumnNames(count, preferredNames, fallbackNames));
    expect(result).toEqual(['name1', 'name2', 'altName3', 'name4', 'altName5']);
  });

  it('should use fallback names when preferred names are not provided', () => {
    const count = 3;
    const preferredNames = [['name1', undefined, 'name3']];
    const fallbackNames = ['fallback1', 'fallback2', 'fallback3'];

    const result = Array.from(yieldUniqueColumnNames(count, preferredNames, fallbackNames));
    expect(result).toEqual(['name1', 'fallback2', 'name3']);
  });

  it('should append postfix to duplicate names to ensure uniqueness', () => {
    const count = 4;
    const preferredNames = [['name', 'name', 'name', 'name']];
    const fallbackNames = ['fallback1', 'fallback2', 'fallback3', 'fallback4'];

    const result = Array.from(yieldUniqueColumnNames(count, preferredNames, fallbackNames));
    expect(result).toEqual(['name', 'name_2', 'name_3', 'name_4']);
  });

  it('should handle mixed preferred and fallback names with duplicates', () => {
    const count = 6;
    const preferredNames = [
      ['name', undefined, 'name', undefined, undefined, undefined],
      [undefined, 'altName', undefined, 'altName', undefined, 'altName'],
    ];
    const fallbackNames = [
      'fallback1',
      'fallback2',
      'fallback3',
      'fallback4',
      'fallback5',
      'fallback6',
    ];

    const result = Array.from(yieldUniqueColumnNames(count, preferredNames, fallbackNames));
    expect(result).toEqual(['name', 'altName', 'name_2', 'altName_2', 'fallback5', 'altName_3']);
  });

  it('should handle empty preferred names', () => {
    const count = 3;
    const preferredNames: Array<Array<string | undefined>> = [];
    const fallbackNames: string[] = ['fallback1', 'fallback2', 'fallback3'];

    const result = Array.from(yieldUniqueColumnNames(count, preferredNames, fallbackNames));
    expect(result).toEqual(['fallback1', 'fallback2', 'fallback3']);
  });
});
