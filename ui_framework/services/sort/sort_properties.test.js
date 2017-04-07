import _ from 'lodash';
import {
  SortProperties,
} from './sort_properties';

describe('SortProperties', () => {
  const name = {
    name: 'name',
    getValue: bird => bird.name,
    isAscending: true,
  };

  const size = {
    name: 'size',
    getValue: bird => bird.size,
    isAscending: false,
  };

  const color = {
    name: 'color',
    getValue: bird => bird.color,
    isAscending: true,
  };

  const birds = [
    {
      name: 'cardinal',
      color: 'red',
      size: 7,
    },
    {
      name: 'bluejay',
      color: 'blue',
      size: 8,
    },
    {
      name: 'chickadee',
      color: 'black and white',
      size: 3,
    }
  ];

  describe('initialSortProperty', () => {
    test('is set', () => {
      const sortProperties = new SortProperties([name, size, color], 'size');
      expect(sortProperties.getSortProperty().name).toBe('size');
    });

    test('throws an error with an invalid property name', () => {
      expect(new SortProperties([name, size, color], 'does not exist')).toThrow();
    });

    test('is optional', () => {
      const sortProperties = new SortProperties([name, size, color]);
      expect(sortProperties.getSortProperty()).toBeUndefined();
    });
  });

  describe('isAscendingByName', () => {
    test('returns initial ascending values', () => {
      const initialColorAscending = color.isAscending;
      const initialNameAscending = name.isAscending;
      const initialSizeAscending = size.isAscending;

      const sortProperties = new SortProperties([name, size, color], 'color');

      expect(sortProperties.isAscendingByName('color')).toBe(initialColorAscending);
      expect(sortProperties.isAscendingByName('name')).toBe(initialNameAscending);
      expect(sortProperties.isAscendingByName('size')).toBe(initialSizeAscending);
    });
  });

  describe('sortOn', () => {
    test('a new property name retains the original sort order', () => {
      const initialColorAscending = color.isAscending;
      const sortProperties = new SortProperties([name, size, color], 'color');
      sortProperties.sortOn('name');
      expect(sortProperties.isAscendingByName('color')).toBe(initialColorAscending);
    });

    test('the same property name twice flips sort order', () => {
      const initialColorAscending = color.isAscending;
      const sortProperties = new SortProperties([name, size, color], 'color');
      sortProperties.sortOn('color');
      expect(sortProperties.isAscendingByName('color')).toBe(!initialColorAscending);
    });
  });

  describe('sortItems', () => {
    test('sorts by initialSortProperty', () => {
      const sortProperties = new SortProperties([name, size, color], 'name');
      const sortedItems = sortProperties.sortItems(birds);
      expect(sortedItems.length).toBe(birds.length);
      expect(sortedItems[0].name).toBe('bluejay');
      expect(sortedItems[1].name).toBe('cardinal');
      expect(sortedItems[2].name).toBe('chickadee');
    });

    test('first sorts by initial isAscending value', () => {
      const sortProperties = new SortProperties([name, size, color], 'size');
      const sortedItems = sortProperties.sortItems(birds);
      expect(sortedItems[0].size).toBe(8);
      expect(sortedItems[1].size).toBe(7);
      expect(sortedItems[2].size).toBe(3);
    });

    test('sorts by descending', () => {
      const sortProperties = new SortProperties([name, size, color], 'name');
      sortProperties.sortOn('size');
      let sortedItems = sortProperties.sortItems(birds);
      expect(sortedItems[0].size).toBe(8);
      expect(sortedItems[1].size).toBe(7);
      expect(sortedItems[2].size).toBe(3);

      sortProperties.sortOn('size');
      sortedItems = sortProperties.sortItems(birds);
      expect(sortedItems[0].size).toBe(3);
      expect(sortedItems[1].size).toBe(7);
      expect(sortedItems[2].size).toBe(8);
    });

    test('empty items array is a noop', () => {
      const sortProperties = new SortProperties([name, size, color], 'color');
      const sortedItems = sortProperties.sortItems([]);
      expect(sortedItems.length).toBe(0);
    });

    test('Does not sort if no sort property is set', () => {
      const sortProperties = new SortProperties([name, size, color]);
      const initialSort = _.clone(birds);
      const unsortedItems = sortProperties.sortItems(birds);
      expect(unsortedItems[0].name).toBe(initialSort[0].name);
      expect(unsortedItems[1].name).toBe(initialSort[1].name);
      expect(unsortedItems[2].name).toBe(initialSort[2].name);
    });
  });
});
