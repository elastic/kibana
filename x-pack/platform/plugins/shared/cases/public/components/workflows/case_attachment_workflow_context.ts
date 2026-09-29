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
      /** Not inside a case attachment surface (alerts page, flyout). */
      status: 'outside';
    }
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

const OUTSIDE_CASE: CaseAttachmentWorkflowContextValue = { status: 'outside' };

/**
 * Kept apart from the provider so the public `useCaseAttachmentWorkflowRun` export does not pull
 * the executor and Workflows UI hooks into the Cases page-load bundle.
 */
export const CaseAttachmentWorkflowContext =
  createContext<CaseAttachmentWorkflowContextValue>(OUTSIDE_CASE);

CaseAttachmentWorkflowContext.displayName = 'CaseAttachmentWorkflowContext';

/** Reads the enclosing case context, or `{ status: 'outside' }` without a provider. */
export const useCaseAttachmentWorkflowContext = (): CaseAttachmentWorkflowContextValue =>
  useContext(CaseAttachmentWorkflowContext);
