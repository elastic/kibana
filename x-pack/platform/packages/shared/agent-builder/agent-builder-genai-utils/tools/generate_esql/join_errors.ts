/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from './actions';
import { isValidateQueryAction, isExecuteQueryAction } from './actions';

/**
 * The ES|QL validator's messages for an unusable join or enrich target. `executeQuery` validates
 * before running, so Elasticsearch is never reached for this class of failure and these are the
 * exact strings that surface.
 *
 * The message identifies the failure class by itself — it is specifically about `lookup` mode — so
 * nothing further needs to be established. Checking whether the cluster holds any lookup index
 * would mean resolving every index in it, which is not affordable on a large deployment.
 */
export const JOIN_TARGET_ERROR = /not a valid JOIN index|unknown policy/i;

/**
 * Whether the validator rejected the join or enrich target of an attempt in this call.
 *
 * `LOOKUP JOIN` requires an `index.mode: lookup` target, which is rare in practice, so a rejection
 * usually means the question genuinely needs data from a second index. This tool can only ever
 * return one query, so it cannot answer such a question: regenerating would at best produce a
 * query over the primary index alone, which passes validation while silently omitting the other
 * half of the answer. Ending the call instead hands the caller a fast, truthful failure it can act
 * on — by querying each index separately, or by explaining the limitation.
 */
export const hasRejectedJoinTarget = (previousActions: Action[]): boolean =>
  previousActions.some(
    (action) =>
      (isValidateQueryAction(action) || isExecuteQueryAction(action)) &&
      !action.success &&
      !!action.error &&
      JOIN_TARGET_ERROR.test(action.error)
  );
