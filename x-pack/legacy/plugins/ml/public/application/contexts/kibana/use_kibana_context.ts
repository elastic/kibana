/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { KibanaContext, KibanaContextValue } from './kibana_context';

export const useKibanaContext = () => {
  const context = useContext(KibanaContext);

  if (
    context.combinedQuery === undefined ||
    context.currentIndexPattern === undefined ||
    context.currentSavedSearch === undefined ||
    context.indexPatterns === undefined ||
    context.kibanaConfig === undefined
  ) {
    throw new Error('required attribute is undefined');
  }

  return context as KibanaContextValue;
};
