/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { InternalProps, SpacesContextProps } from './types';

export const getSpacesContextProviderWrapper = async (
  internalProps: InternalProps
): Promise<React.FC<SpacesContextProps>> => {
  const { SpacesContextWrapperInternal } = await import('./wrapper_internal');
  return ({ children, ...props }: SpacesContextProps) => {
    return <SpacesContextWrapperInternal {...{ ...internalProps, ...props, children }} />;
  };
};
