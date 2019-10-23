/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { LegacyCoreStart } from 'src/core/public';

interface CoreMountContext {
  core: LegacyCoreStart;
}

// TODO: Replace CoreStart/CoreSetup with AppMountContext
// see: https://github.com/elastic/kibana/pull/41007

export const KibanaCoreContext = createContext({} as CoreMountContext['core']);

export const KibanaCoreContextProvider: React.FC<{ core: CoreMountContext['core'] }> = props => (
  <KibanaCoreContext.Provider {...props} value={props.core} children={props.children} />
);

export function useKibanaCore() {
  return useContext(KibanaCoreContext);
}
