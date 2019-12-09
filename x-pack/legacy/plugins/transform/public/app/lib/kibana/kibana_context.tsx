/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, FC } from 'react';

import { SavedSearch } from '../../../../../../../../src/legacy/core_plugins/kibana/public/discover/types';
import {
  IndexPattern,
  IndexPatternsContract,
} from '../../../../../../../../src/plugins/data/public';
import { KibanaConfig } from '../../../../../../../../src/legacy/server/kbn_server';

// set() method is missing in original d.ts
interface KibanaConfigTypeFix extends KibanaConfig {
  set(key: string, value: any): void;
}

interface UninitializedKibanaContextValue {
  initialized: boolean;
}

export interface InitializedKibanaContextValue {
  combinedQuery: any;
  currentIndexPattern: IndexPattern;
  currentSavedSearch: SavedSearch;
  indexPatterns: IndexPatternsContract;
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

/**
 * Custom hook to get the current kibanaContext.
 *
 * @remarks
 * This hook should only be used in components wrapped in `RenderOnlyWithInitializedKibanaContext`,
 * otherwise it will throw an error when KibanaContext hasn't been initialized yet.
 * In return you get the benefit of not having to check if it's been initialized in the component
 * where it's used.
 *
 * @returns `kibanaContext`
 */
export const useKibanaContext = () => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContextInitialized(kibanaContext)) {
    throw new Error('useKibanaContext: kibanaContext not initialized');
  }

  return kibanaContext;
};

/**
 * Wrapper component to render children only if `kibanaContext` has been initialized.
 * In combination with `useKibanaContext` this avoids having to check for the initialization
 * in consuming components.
 *
 * @returns `children` or `null` depending on whether `kibanaContext` is initialized or not.
 */
export const RenderOnlyWithInitializedKibanaContext: FC = ({ children }) => {
  const kibanaContext = useContext(KibanaContext);

  return isKibanaContextInitialized(kibanaContext) ? <>{children}</> : null;
};
