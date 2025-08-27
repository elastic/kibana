/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { EuiSkeletonText } from '@elastic/eui';

import { type RouteResolverContext } from './use_resolver';

export const PageLoader: FC<PropsWithChildren<{ context: RouteResolverContext }>> = ({
  context,
  children,
}) => {
  const isLoading = !context.initialized;

  if (context?.resolvedComponent) {
    return context.resolvedComponent;
  }

  return (
    <EuiSkeletonText lines={10} isLoading={isLoading}>
      {!isLoading ? children : null}
    </EuiSkeletonText>
  );
};
