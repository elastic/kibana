/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStartServices } from './use_core';

export interface AutomaticImportAuthz {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

interface AutomaticImportCapabilities {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
}

/** Resolves what the current user may do in Automatic Import from the `automatic_import` feature UI capabilities. */
export const useAutomaticImportAuthz = (): AutomaticImportAuthz => {
  const { application, automaticImport } = useStartServices();
  const capabilities = application.capabilities.automatic_import as
    | AutomaticImportCapabilities
    | undefined;
  const isAvailable = Boolean(automaticImport) && capabilities !== undefined;

  return {
    canView: isAvailable && capabilities?.view === true,
    canCreate: isAvailable && capabilities?.create === true,
    canEdit: isAvailable && capabilities?.edit === true,
    canDelete: isAvailable && capabilities?.delete === true,
    canApprove: isAvailable && capabilities?.approve === true,
  };
};
