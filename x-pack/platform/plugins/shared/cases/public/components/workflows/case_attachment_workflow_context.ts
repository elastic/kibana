/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';

export type CaseAttachmentWorkflowContextValue =
  | {
      status: 'available';
      caseId: string;
      /**
       * Builds a Cases-routed executor for this case. The executor's services are resolved by the
       * provider, inside the Cases tree, so surfaces owned by other plugins can call it from their own tree.
       */
      createExecutor: (origin: CaseWorkflowRunOrigin) => RunWorkflowExecutor;
    }
  | {
      /** Inside a case, but the current user cannot run workflows through Cases. */
      status: 'unavailable';
      caseId: string;
    };

/**
 * Kept apart from the provider so the public `useCaseAttachmentWorkflowRun` export does not pull
 * the executor and Workflows UI hooks into the Cases page-load bundle.
 */
export const CaseAttachmentWorkflowContext = createContext<
  CaseAttachmentWorkflowContextValue | undefined
>(undefined);

CaseAttachmentWorkflowContext.displayName = 'CaseAttachmentWorkflowContext';

/**
 * Reads the enclosing case context. Returns `undefined` only outside a case attachment surface.
 * Absence is a legitimate state (alerts page, flyout), not a programming error, so this does not throw.
 */
export const useCaseAttachmentWorkflowContext = ():
  | CaseAttachmentWorkflowContextValue
  | undefined => useContext(CaseAttachmentWorkflowContext);
