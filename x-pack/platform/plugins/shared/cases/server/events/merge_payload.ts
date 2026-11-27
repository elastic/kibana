/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMergeContext } from '../client/types';
import type { CaseMergeEventPayload } from './types';

/**
 * The `merge` part of an event payload when the write is part of a merge, else nothing. A new
 * destination has no id until it is created, so the case the event is about stands in for it.
 */
export const getMergeEventPayload = (
  mergeContext: CasesMergeContext | undefined,
  caseId: string
): { merge?: CaseMergeEventPayload } =>
  mergeContext == null
    ? {}
    : {
        merge: {
          sourceCaseIds: mergeContext.sourceCaseIds,
          destinationCaseId: mergeContext.destinationCaseId ?? caseId,
        },
      };
