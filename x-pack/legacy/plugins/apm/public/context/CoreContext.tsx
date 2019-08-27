/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { InternalCoreStart } from 'src/core/public';

const CoreContext = createContext<InternalCoreStart>({} as InternalCoreStart);
const CoreProvider: React.SFC<{ core: InternalCoreStart }> = props => {
  const { core, ...restProps } = props;
  return <CoreContext.Provider value={core} {...restProps} />;
};

export { CoreContext, CoreProvider };
