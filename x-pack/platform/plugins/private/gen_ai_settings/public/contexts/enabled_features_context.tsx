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
import { isAnonymizationCapabilities } from '../utils/anonymization_capabilities';

export interface EnabledFeatures {
  showSpacesIntegration: boolean;
  isPermissionsBased: boolean;
  showAiBreadcrumb: boolean;
  showAiAssistantsVisibilitySetting: boolean;
  showChatExperienceSetting: boolean;
  showAnonymizationProfilesSection: boolean;
}

export const EnabledFeaturesContext = createContext<EnabledFeatures>({
  showSpacesIntegration: true,
  isPermissionsBased: false,
  showAiBreadcrumb: true,
  showAiAssistantsVisibilitySetting: true,
  showChatExperienceSetting: true,
  showAnonymizationProfilesSection: false,
});

interface Props {
  config: GenAiSettingsConfigType;
}

export const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>> = ({
  children,
  config,
}) => {
  const {
    services: {
      spaces,
      application: { capabilities },
    },
  } = useKibana();

  const activeSpace$ = React.useMemo(
    () => spaces?.getActiveSpace$?.() ?? of<Space | undefined>(undefined),
    [spaces]
  );
  const activeSpace = useObservable(activeSpace$);

  const contextFeatures = useMemo(() => {
    const isSolutionView = Boolean(activeSpace?.solution && activeSpace.solution !== 'classic');

    const showAiAssistantsVisibilitySetting =
      config.showAiAssistantsVisibilitySetting === false ? false : !isSolutionView;

    const hasObservabilityAssistant = capabilities.observabilityAIAssistant?.show === true;
    const hasSecurityAssistant = capabilities.securitySolutionAssistant?.['ai-assistant'] === true;
    const hasAgent = capabilities.agentBuilder?.manageAgents === true;
    const hasAgentAndAnyAssistant = (hasObservabilityAssistant || hasSecurityAssistant) && hasAgent;

    const showChatExperienceSetting =
      config.showChatExperienceSetting === false ? false : hasAgentAndAnyAssistant;

    const anonymizationCapabilities = capabilities.anonymization;
    const showAnonymizationProfilesSection =
      isAnonymizationCapabilities(anonymizationCapabilities) &&
      anonymizationCapabilities.show === true &&
      config.showAnonymizationProfileSettings;

    return {
      showSpacesIntegration: config.showSpacesIntegration,
      showAiBreadcrumb: config.showAiBreadcrumb,
      isPermissionsBased: isSolutionView,
      showAiAssistantsVisibilitySetting,
      showChatExperienceSetting,
      showAnonymizationProfilesSection,
    };
  }, [config, activeSpace, capabilities]);

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
