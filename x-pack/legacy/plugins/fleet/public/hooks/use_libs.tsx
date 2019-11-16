/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { FrontendLibs } from '../lib/types';

export const LibsContext = React.createContext<FrontendLibs | null>(null);

export function useLibs() {
  const libs = useContext(LibsContext);
  if (libs === null) {
    throw new Error('You need to provide LibsContext');
  }
  return libs;
}
