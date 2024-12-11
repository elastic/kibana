/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ExperimentalFeatures, MlFeatures } from '../../../../common/constants/app';

export interface EnabledFeatures {
  showLogsSuppliedConfigurationsInfo: boolean;
  showContextualInsights: boolean;
  showNodeInfo: boolean;
  showMLNavMenu: boolean;
  showLicenseInfo: boolean;
  isADEnabled: boolean;
  isDFAEnabled: boolean;
  isNLPEnabled: boolean;
  showRuleFormV2: boolean;
}
export const EnabledFeaturesContext = createContext<EnabledFeatures>({
  showLogsSuppliedConfigurationsInfo: true,
  showContextualInsights: true,
  showNodeInfo: true,
  showMLNavMenu: true,
  showLicenseInfo: true,
  isADEnabled: true,
  isDFAEnabled: true,
  isNLPEnabled: true,
  showRuleFormV2: true,
});

interface Props {
  isServerless: boolean;
  mlFeatures: MlFeatures;
  showMLNavMenu?: boolean;
  experimentalFeatures?: ExperimentalFeatures;
}

export const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>> = ({
  children,
  isServerless,
  showMLNavMenu = true,
  mlFeatures,
  experimentalFeatures,
}) => {
  const features: EnabledFeatures = {
    showLogsSuppliedConfigurationsInfo: !isServerless,
    showContextualInsights: isServerless,
    showNodeInfo: !isServerless,
    showMLNavMenu,
    showLicenseInfo: !isServerless,
    isADEnabled: mlFeatures.ad,
    isDFAEnabled: mlFeatures.dfa,
    isNLPEnabled: mlFeatures.nlp,
    showRuleFormV2: experimentalFeatures?.ruleFormV2 ?? false,
  };

  return (
    <EnabledFeaturesContext.Provider value={features}>{children}</EnabledFeaturesContext.Provider>
  );
};

export function useEnabledFeatures() {
  const context = useContext(EnabledFeaturesContext);
  return useMemo(() => {
    return context;
  }, [context]);
}
