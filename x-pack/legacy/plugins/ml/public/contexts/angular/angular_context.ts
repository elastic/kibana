/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IndexPattern } from 'ui/index_patterns';

export interface AngularContextValue {
  combinedQuery?: any;
  currentIndexPattern?: IndexPattern;
  currentSavedSearch?: any;
  indexPatterns?: any;
  kbnBaseUrl?: string;
  kibanaConfig?: any;
}

export type SavedSearchQuery = object;

export const AngularContext = React.createContext<AngularContextValue>({});
