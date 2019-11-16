/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { PluginCore } from '../plugin';

const CoreContext = createContext<PluginCore>({} as PluginCore);
const CoreProvider: React.SFC<{ core: PluginCore }> = props => {
  const { core, ...restProps } = props;
  return <CoreContext.Provider value={core} {...restProps} />;
};

export { CoreContext, CoreProvider };
