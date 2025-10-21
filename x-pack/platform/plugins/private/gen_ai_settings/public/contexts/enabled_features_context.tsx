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
import type { GenAiSettingsConfigType } from '../../common/config';

export interface EnabledFeatures {
  showSpacesIntegration: boolean;
  isPermissionsBased: boolean;
  showAiBreadcrumb: boolean;
  showAiAssistantsVisibilitySetting: boolean;
}

export const EnabledFeaturesContext = createContext<EnabledFeatures>({
  showSpacesIntegration: true,
  isPermissionsBased: false,
  showAiBreadcrumb: true,
  showAiAssistantsVisibilitySetting: true,
});

interface Props {
  config: GenAiSettingsConfigType;
}

export const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>> = ({
  children,
  config,
}) => {
  const { services } = useKibana();
  const spaces = services?.spaces ?? undefined;

  const activeSpace$ = React.useMemo(
    () => spaces?.getActiveSpace$?.() ?? of<Space | undefined>(undefined),
    [spaces]
  );
  const activeSpace = useObservable(activeSpace$);

  const contextFeatures = useMemo(() => {
    const isSolutionView = Boolean(activeSpace?.solution && activeSpace.solution !== 'classic');

    const showAiAssistantsVisibilitySetting =
      config.showAiAssistantsVisibilitySetting === false ? false : !isSolutionView;

    return {
      showSpacesIntegration: config.showSpacesIntegration,
      showAiBreadcrumb: config.showAiBreadcrumb,
      isPermissionsBased: isSolutionView,
      showAiAssistantsVisibilitySetting,
    };
  }, [config, activeSpace]);

  return (
    <EnabledFeaturesContext.Provider value={contextFeatures}>
      {children}
    </EnabledFeaturesContext.Provider>
  );
};

export const useEnabledFeatures = (): EnabledFeatures => {
  const context = useContext(EnabledFeaturesContext);
  if (!context) {
    throw new Error('useEnabledFeatures must be used within EnabledFeaturesContextProvider');
  }
  return context;
};
