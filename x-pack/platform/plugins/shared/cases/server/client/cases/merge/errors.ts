/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeBlockedErrorAttributes } from '../../../../common/constants/error_codes';
import { CASES_API_ERROR_CODES } from '../../../../common/constants/error_codes';
import type { MergeConflict, MergeLimit } from '../../../../common/types/api';
import { createTypedApiError, getTypedApiErrorAttributes } from '../../../common/api_errors';
import { isCaseError } from '../../../common/error';
import type { MergeContext } from './context';
import { getUnresolvedConflicts } from './fields';

const describeConflict = ({ field, key, label }: MergeConflict) =>
  label ?? (key != null ? `${field}.${key}` : field);

/**
 * Refuses the merge, before anything is written, while a field the cases disagree on has no value
 * in the request, a value is invalid or a required one is empty, or a kind is over its limit.
 */
export const throwIfMergeBlocked = ({ fields, plan }: Pick<MergeContext, 'fields' | 'plan'>) => {
  const conflicts = getUnresolvedConflicts(fields.conflicts);
  const limits: MergeLimit[] = [...plan.limits, ...fields.limits];
  if (conflicts.length === 0 && limits.length === 0) {
    return;
  }

  const reasons = [
    ...(conflicts.length > 0 ? [`resolve ${conflicts.map(describeConflict).join(', ')}`] : []),
    ...limits.map(({ kind, max, overBy }) => `leave out ${overBy} ${kind} to stay within ${max}`),
  ];
  throw createTypedApiError({
    statusCode: 400,
    message: `The cases can't be merged yet: ${reasons.join('; ')}.`,
    attributes: {
      code: CASES_API_ERROR_CODES.MERGE_BLOCKED,
      conflicts: conflicts.map(({ resolved: _resolved, ...conflict }) => conflict),
      limits,
    },
  });
};

/**
 * The conflicts and limits a refused merge reports, from the error `casesClient.cases.merge`
 * throws. Undefined for any other error.
 */
export const getMergeBlockedAttributes = (
  error: unknown
): MergeBlockedErrorAttributes | undefined => {
  const attributes = getTypedApiErrorAttributes(isCaseError(error) ? error.boomify() : error);
  return attributes?.code === CASES_API_ERROR_CODES.MERGE_BLOCKED ? attributes : undefined;
};
