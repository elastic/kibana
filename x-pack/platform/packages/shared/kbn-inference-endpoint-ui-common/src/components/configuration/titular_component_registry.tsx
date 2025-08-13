/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { MAX_NUMBER_OF_ALLOCATIONS } from '../../constants';
import { AdaptiveAllocationsTitle } from './adaptive_allocations_title';

const titularComponents: Record<string, FC> = {
  [MAX_NUMBER_OF_ALLOCATIONS]: AdaptiveAllocationsTitle,
};

export const ConfigFieldTitularComponent = ({ configKey }: { configKey: string }) => {
  const Component = titularComponents[configKey];

  if (!Component) {
    return null;
  }
  return <Component />;
};
