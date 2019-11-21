/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { createContext, useContext } from 'react';

/**
 * This is a temporary provider and hook for use with hooks until react-apollo
 * has upgraded to the new-style `createContext` api.
 */

export const ApolloClientContext = createContext<ApolloClient<{}> | undefined>(undefined);

export const useApolloClient = () => {
  return useContext(ApolloClientContext);
};

export class DependencyError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
