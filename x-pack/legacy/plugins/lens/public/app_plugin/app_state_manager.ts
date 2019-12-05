/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from 'src/plugins/data/public';
import {
  IndexPattern as IndexPatternInstance,
  SavedQuery,
} from 'src/legacy/core_plugins/data/public';
import { Document } from '../persistence';
import { esFilters } from '../../../../../../src/plugins/data/public';
import { DateRange } from '../../common';
import { basicStateManager } from '../state_manager';

export interface State {
  isLoading: boolean;
  isSaveModalVisible: boolean;
  indexPatternsForTopNav: IndexPatternInstance[];
  persistedDoc?: Document;
  lastKnownDoc?: Document;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: esFilters.Filter[];
  savedQuery?: SavedQuery;
}

export function createAppStateManager({
  dateRange,
  language,
  docId,
}: {
  dateRange: DateRange;
  language: string;
  docId?: string;
}) {
  return basicStateManager<State>({
    dateRange,
    isLoading: !!docId,
    isSaveModalVisible: false,
    indexPatternsForTopNav: [],
    query: { query: '', language },
    filters: [],
  });
}
