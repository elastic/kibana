/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { AngularContext, AngularContextValue } from './angular_context';

export const useAngularContext = () => {
  const context = useContext(AngularContext);

  if (
    context.combinedQuery === undefined ||
    context.currentIndexPattern === undefined ||
    context.currentSavedSearch === undefined ||
    context.indexPatterns === undefined ||
    context.kbnBaseUrl === undefined ||
    context.kibanaConfig === undefined
  ) {
    throw new Error('required attribute is undefined');
  }

  return context as Required<AngularContextValue>;
};
