/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

export interface Authorization {
  canCreateIntegrations: boolean;
  canExecuteConnectors: boolean;
  canCreateConnectors: boolean;
}
export const useAuthorization = (): Authorization => {
  const { capabilities } = useKibana().services.application;
  const { fleet: integrations, fleetv2: fleet, actions } = capabilities;
  return {
    canCreateIntegrations: Boolean(fleet?.all && integrations?.all),
    canExecuteConnectors: Boolean(actions?.show && actions?.execute),
    canCreateConnectors: Boolean(actions?.save),
  };
};

export interface RoutesAuthorization {
  canUseAutomaticImport: boolean;
  canUseIntegrationUpload: boolean;
}
export const useRoutesAuthorization = (): RoutesAuthorization => {
  const { canCreateIntegrations, canExecuteConnectors } = useAuthorization();
  return {
    canUseAutomaticImport: canCreateIntegrations && canExecuteConnectors,
    canUseIntegrationUpload: canCreateIntegrations,
  };
};
