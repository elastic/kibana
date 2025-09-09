/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ApplicationStart, DocLinksStart, FeatureFlagsStart, IToasts } from '@kbn/core/public';

type DefaultAiConnectorSettingContext = ReturnType<typeof DefaultAiConnector>;

const DefaultAiConnectorSettingContext = createContext<null | DefaultAiConnectorSettingContext>(
  null
);

export const useDefaultAiConnectorSettingContext = () => {
  const context = useContext(DefaultAiConnectorSettingContext);
  if (!context) {
    throw new Error(
      'useDefaultAiConnectorContext must be inside of a SettingsContextProvider.Provider.'
    );
  }
  return context;
};

export const DefaultAiConnectorSettingsContextProvider = ({
  children,
  toast,
  application,
  docLinks,
  featureFlags,
}: {
  children: React.ReactNode;
  toast: IToasts | undefined;
  application: ApplicationStart;
  docLinks: DocLinksStart;
  featureFlags: FeatureFlagsStart;
}) => {
  const value = DefaultAiConnector({
    toast,
    application,
    docLinks,
    featureFlags,
  });
  return (
    <DefaultAiConnectorSettingContext.Provider value={value}>
      {children}
    </DefaultAiConnectorSettingContext.Provider>
  );
};

const DefaultAiConnector = ({
  toast,
  application,
  docLinks,
  featureFlags,
}: {
  toast: IToasts | undefined;
  application: ApplicationStart;
  docLinks: DocLinksStart;
  featureFlags: FeatureFlagsStart;
}) => {
  return {
    toast,
    application,
    docLinks,
    featureFlags,
  };
};

export {
  DefaultAiConnectorSettingContext as SettingsContext,
  useDefaultAiConnectorSettingContext as useSettingsContext,
};
