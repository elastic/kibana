/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters } from 'src/plugins/data/public';
import { State } from './app_state_manager';
import { StateSetter, Pipable } from '../state_manager';

export interface Opts {
  setState: StateSetter<State>;
  filterManager: {
    getUpdates$: () => Pipable<void>;
    getFilters: () => esFilters.Filter[];
  };
  trackDataEvent: (e: string) => void;
}

export function filterUpdater({ filterManager, setState, trackDataEvent }: Opts) {
  return filterManager.getUpdates$().subscribe(() => {
    setState(s => ({
      ...s,
      filters: filterManager.getFilters(),
    }));
    trackDataEvent('app_filters_updated');
  });
}
