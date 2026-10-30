/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'react';
import React from 'react';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { CasesFeaturesAllRequired, CasesPermissions } from '../../containers/types';
import type { ReleasePhase } from '../types';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { CasesContextStoreAction } from './state/cases_context_reducer';

type CasesContextValueDispatch = Dispatch<CasesContextStoreAction>;

export interface CasesContextValue {
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  owner: string[];
  permissions: CasesPermissions;
  basePath: string;
  features: CasesFeaturesAllRequired;
  releasePhase: ReleasePhase;
  dispatch: CasesContextValueDispatch;
  /** Used to scope an ownerless context (the top-level app) to one case's owner. */
  getFilesClient?: (scope: string) => ScopedFilesClient;
}

// Kept apart from the provider so light modules (the attachment registry) can read it without
// loading the provider and everything it renders.
export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);
