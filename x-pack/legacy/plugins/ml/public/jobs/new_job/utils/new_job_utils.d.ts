/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';
import { IndexPatternTitle } from '../../../../common/types/kibana';

export interface SearchItems {
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  query: any;
  combinedQuery: any;
}

export function SearchItemsProvider($route: Record<string, any>, config: any): () => SearchItems;
