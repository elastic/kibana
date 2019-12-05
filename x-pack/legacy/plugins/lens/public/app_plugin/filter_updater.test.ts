/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { filterUpdater } from './filter_updater';
import { esFilters } from 'src/plugins/data/public';

describe('filterUpdater', () => {
  it('should update filters on change', () => {
    const updates$ = new BehaviorSubject<void>(undefined);
    const setState = jest.fn();
    let filters: esFilters.Filter[] = [];

    filterUpdater({
      setState,
      filterManager: {
        getUpdates$: () => updates$,
        getFilters: () => filters,
      },
      trackDataEvent: jest.fn(),
    });

    filters = [{ meta: { alias: 'shazm', disabled: true, negate: true } }];
    updates$.next(undefined);

    const [stateSetter] = last(setState.mock.calls);
    expect(stateSetter({ something: 'else', filters: [] })).toEqual({
      something: 'else',
      filters,
    });
  });
});
