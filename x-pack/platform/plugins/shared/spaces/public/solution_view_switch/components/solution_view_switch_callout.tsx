/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  SolutionViewSwitchCalloutInternalProps,
  SolutionViewSwitchCalloutProps,
} from '../types';

export const getSolutionViewSwitchCalloutComponent = async (
  internalProps: SolutionViewSwitchCalloutInternalProps
): Promise<React.FC<SolutionViewSwitchCalloutProps>> => {
  const { SolutionViewSwitchCalloutInternal } = await import(
    './solution_view_switch_callout_internal'
  );
  return (props: SolutionViewSwitchCalloutProps) => {
    return <SolutionViewSwitchCalloutInternal {...{ ...internalProps, ...props }} />;
  };
};
