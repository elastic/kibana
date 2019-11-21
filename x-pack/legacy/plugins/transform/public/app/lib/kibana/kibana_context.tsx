/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';

import {
  IndexPattern as IndexPatternType,
  IndexPatterns as IndexPatternsType,
} from 'ui/index_patterns';

import { SavedSearch } from '../../../../../../../../src/legacy/core_plugins/kibana/public/discover/types';
import { KibanaConfig } from '../../../../../../../../src/legacy/server/kbn_server';

// set() method is missing in original d.ts
export interface KibanaConfigTypeFix extends KibanaConfig {
  set(key: string, value: any): void;
}

interface UninitializedKibanaContextValue {
  initialized: boolean;
}
interface InitializedKibanaContextValue {
  combinedQuery: any;
  currentIndexPattern: IndexPatternType;
  currentSavedSearch: SavedSearch;
  indexPatterns: IndexPatternsType;
  initialized: boolean;
  kbnBaseUrl: string;
  kibanaConfig: KibanaConfigTypeFix;
}

export type KibanaContextValue = UninitializedKibanaContextValue | InitializedKibanaContextValue;

export function isKibanaContextInitialized(arg: any): arg is InitializedKibanaContextValue {
  return arg.initialized;
}

export type SavedSearchQuery = object;

export const KibanaContext = createContext<KibanaContextValue>({ initialized: false });
