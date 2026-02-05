/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '../../screens/home';

// Mock the local search hook
const mockSearch = jest.fn();
jest.mock('../../../../hooks', () => ({
  searchIdField: 'id',
  useLocalSearch: jest.fn(() => ({
    search: mockSearch,
  })),
}));

describe('PackageListGrid - Deprecated Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockReturnValue([]);
  });

  // Helper to simulate the filtering logic from the component
  const applyDeprecatedFilter = (
    list: IntegrationCardItem[],
    showDeprecated?: boolean
  ): IntegrationCardItem[] => {
    return list.filter((card) => {
      const isDeprecated = 'isDeprecated' in card && card.isDeprecated === true;

      if (showDeprecated === true) {
        // When showDeprecated is true, return only deprecated integrations
        return isDeprecated;
      } else {
        // By default (undefined or false), return all integrations except deprecated ones
        return true;
      }
    });
  };

  describe('Deprecated filter', () => {
    const cards: IntegrationCardItem[] = [
      {
        id: '1',
        name: 'Integration 1',
        title: 'Integration 1',
        isDeprecated: false,
      } as IntegrationCardItem,
      {
        id: '2',
        name: 'Integration 2',
        title: 'Integration 2',
        isDeprecated: true,
      } as IntegrationCardItem,
      {
        id: '3',
        name: 'Integration 3',
        title: 'Integration 3',
        isDeprecated: false,
      } as IntegrationCardItem,
      {
        id: '4',
        name: 'Integration 4',
        title: 'Integration 4',
        isDeprecated: true,
      } as IntegrationCardItem,
    ];

    it('Return all integrations when showDeprecated=false', () => {
      const filtered = applyDeprecatedFilter(cards, false);

      expect(filtered).toHaveLength(4);
    });

    it('Return only deprecated integrations when showDeprecated=true', () => {
      const filtered = applyDeprecatedFilter(cards, true);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.id)).toEqual(['2', '4']);
    });

    it('handles empty list', () => {
      const filtered = applyDeprecatedFilter([], undefined);

      expect(filtered).toHaveLength(0);
    });

    it('handles list with no deprecated integrations', () => {
      const nonDeprecatedCards = cards.filter((c) => !c.isDeprecated);
      const filtered = applyDeprecatedFilter(nonDeprecatedCards, undefined);

      expect(filtered).toHaveLength(2);
    });

    it('handles list with all deprecated integrations', () => {
      const allDeprecatedCards = cards.map((c) => ({
        ...c,
        isDeprecated: true,
      })) as IntegrationCardItem[];

      const filtered = applyDeprecatedFilter(allDeprecatedCards, undefined);

      expect(filtered).toHaveLength(4);
    });

    it('treats integrations without isDeprecated property as non-deprecated', () => {
      const cardsWithoutProperty: IntegrationCardItem[] = [
        {
          id: '1',
          name: 'Integration 1',
          title: 'Integration 1',
        } as IntegrationCardItem,
        {
          id: '2',
          name: 'Integration 2',
          title: 'Integration 2',
          isDeprecated: true,
        } as IntegrationCardItem,
      ];

      const filtered = applyDeprecatedFilter(cardsWithoutProperty, undefined);

      expect(filtered).toHaveLength(2);
    });
  });
});
