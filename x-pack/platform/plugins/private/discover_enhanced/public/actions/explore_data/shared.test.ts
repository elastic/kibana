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

describe('explore data with an ES|QL source', () => {
  // An ES|QL source has the id of a dataset, which Discover cannot open as a data view.
  it('leaves an ES|QL source out of the data views of the panel', () => {
    expect(getDataViews(publishing([esqlSource('esql-dataset-id'), dataView('a')]))).toEqual(['a']);
  });

  it('still finds the one data view published next to an ES|QL source', () => {
    expect(hasExactlyOneDataView(publishing([esqlSource('esql-dataset-id'), dataView('a')]))).toBe(
      true
    );
  });

  it('finds no data view when the panel only publishes an ES|QL source', () => {
    expect(hasExactlyOneDataView(publishing([esqlSource('esql-dataset-id')]))).toBe(false);
  });
});
