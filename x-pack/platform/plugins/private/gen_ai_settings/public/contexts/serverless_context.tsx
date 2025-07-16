/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import type { Space } from '@kbn/spaces-plugin/public';
import { useKibana } from '../hooks/use_kibana';

export interface EnabledFeatures {
  showSpacesIntegration: boolean;
  /** True when the current space is in a Solution (project) view */
  isSolutionView: boolean;
}

export const EnabledFeaturesContext = createContext<EnabledFeatures>({
  showSpacesIntegration: true,
  isSolutionView: false,
});

interface Props {
  isServerless: boolean;
}

export const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>> = ({
  children,
  isServerless,
}) => {
  const { services } = useKibana();
  const spaces = services?.spaces ?? undefined;

  const activeSpace$ = React.useMemo(
    () => spaces?.getActiveSpace$?.() ?? of<Space | undefined>(undefined),
    [spaces]
  );
  const activeSpace = useObservable(activeSpace$);

  const features: EnabledFeatures = useMemo(() => {
    const isSolutionView =
      !isServerless && Boolean(activeSpace?.solution && activeSpace.solution !== 'classic');

    return {
      showSpacesIntegration: !isServerless,
      isSolutionView,
    };
  }, [isServerless, activeSpace]);

  return (
    <EnabledFeaturesContext.Provider value={features}>{children}</EnabledFeaturesContext.Provider>
  );
};

export const useEnabledFeatures = (): EnabledFeatures => {
  const context = useContext(EnabledFeaturesContext);
  if (!context) {
    throw new Error('useEnabledFeatures must be used within EnabledFeaturesContextProvider');
  }
  return context;
};
