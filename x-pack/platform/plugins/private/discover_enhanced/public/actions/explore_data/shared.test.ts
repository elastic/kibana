/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FilterableSource } from '@kbn/data-source';
import { getDataViews, hasExactlyOneDataView } from './shared';

const dataView = (id: string): FilterableSource => ({
  id,
  title: id,
  fields: [],
  isTimeBased: () => false,
});

const esqlSource = (id: string): FilterableSource => ({ ...dataView(id), kind: 'esql' });

const publishing = (sources?: FilterableSource[]) => ({
  dataSources$: new BehaviorSubject<FilterableSource[] | undefined>(sources),
});

describe('explore data shared helpers', () => {
  describe('getDataViews', () => {
    it('returns the ids of the published data views', () => {
      expect(getDataViews(publishing([dataView('a'), dataView('b')]))).toEqual(['a', 'b']);
    });

    it('leaves out an ES|QL source, whose id is not the id of a data view', () => {
      expect(getDataViews(publishing([esqlSource('esql-dataset-id'), dataView('a')]))).toEqual([
        'a',
      ]);
    });

    it('returns nothing when the panel does not publish data sources', () => {
      expect(getDataViews({})).toEqual([]);
      expect(getDataViews(publishing(undefined))).toEqual([]);
    });
  });

  describe('hasExactlyOneDataView', () => {
    it('is true for a single data view', () => {
      expect(hasExactlyOneDataView(publishing([dataView('a')]))).toBe(true);
    });

    it('is true when an ES|QL source is published next to a single data view', () => {
      expect(
        hasExactlyOneDataView(publishing([esqlSource('esql-dataset-id'), dataView('a')]))
      ).toBe(true);
    });

    it('is false when the panel only publishes an ES|QL source, which Discover cannot open as a data view', () => {
      expect(hasExactlyOneDataView(publishing([esqlSource('esql-dataset-id')]))).toBe(false);
    });

    it('is false for several data views', () => {
      expect(hasExactlyOneDataView(publishing([dataView('a'), dataView('b')]))).toBe(false);
    });
  });
});
