/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IndexPattern } from 'ui/index_patterns';

export interface KibanaContextValue {
  combinedQuery?: any;
  currentIndexPattern?: IndexPattern;
  currentSavedSearch?: any;
  indexPatterns?: any;
  kbnBaseUrl?: string;
  kibanaConfig?: any;
}

export type SavedSearchQuery = object;

// This context provides dependencies which can be injected
// via angularjs only (like services, currentIndexPattern etc.).
// Because we cannot just import these dependencies, the default value
// for the context is just {} and the value's type has optional
// attributes for the angularjs based dependencies. Therefore, the
// actual dependencies are set like we did previously with KibanaContext
// in the wrapping angularjs directive. In the custom hook we check if
// the dependencies are present with error reporting if they weren't
// added properly. That's why in tests, these custom hooks must not
// be mocked, instead <UiChrome.Provider value="mocked-value">` needs
// to be used. This guarantees that we have both properly set up
// TypeScript support and runtime checks for these dependencies.
// Multiple custom hooks can be created to access subsets of
// the overall context value if necessary too,
// see useCurrentIndexPattern() for example.
export const KibanaContext = React.createContext<KibanaContextValue>({});
