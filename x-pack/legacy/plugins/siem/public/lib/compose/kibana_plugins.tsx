/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { PluginsStart } from 'ui/new_platform/new_platform';

interface PluginsMountContext {
  plugins: PluginsStart;
}

// TODO: Replace CoreStart/CoreSetup with AppMountContext
// see: https://github.com/elastic/kibana/pull/41007

export const KibanaPluginsContext = createContext({} as PluginsMountContext['plugins']);

export const KibanaPluginsContextProvider: React.FC<{
  plugins: PluginsMountContext['plugins'];
}> = props => (
  <KibanaPluginsContext.Provider {...props} value={props.plugins} children={props.children} />
);

export function useKibanaPlugins() {
  return useContext(KibanaPluginsContext);
}
