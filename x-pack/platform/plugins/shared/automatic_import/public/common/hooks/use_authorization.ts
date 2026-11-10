/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

export interface Authorization {
  /** Kibana Management > Connectors: All (create/update connectors). */
  canCreateConnectors: boolean;
  /** Automatic Import: Read or All. */
  canViewIntegrations: boolean;
  /** Automatic Import: All. */
  canCreateIntegration: boolean;
  /** Automatic Import: All. */
  canEditIntegration: boolean;
  /** Automatic Import: All. */
  canDeleteIntegration: boolean;
  /** Automatic Import: All. */
  canApproveIntegration: boolean;
}

interface AutomaticImportCapabilities {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
}

/** Resolves what the current user may do from the `actions` and `automatic_import` feature UI capabilities. */
export const useAuthorization = (): Authorization => {
  const { capabilities } = useKibana().services.application;
  const { actions } = capabilities;
  const automaticImport = capabilities.automatic_import as AutomaticImportCapabilities | undefined;
  return {
    canCreateConnectors: Boolean(actions?.save),
    canViewIntegrations: automaticImport?.view === true,
    canCreateIntegration: automaticImport?.create === true,
    canEditIntegration: automaticImport?.edit === true,
    canDeleteIntegration: automaticImport?.delete === true,
    canApproveIntegration: automaticImport?.approve === true,
  };
};
