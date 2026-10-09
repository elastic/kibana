/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { isEsqlSubPlanTooLargeError } from './esql_sub_plan_too_large_error';

const SUB_PLAN_REASON = 'sub-plan execution results too large [21mb] > [20mb]';

const makeResponseError = (statusCode: number, body?: unknown) =>
  new errors.ResponseError({ statusCode, body } as DiagnosticResult);

describe('isEsqlSubPlanTooLargeError', () => {
  describe('positive match', () => {
    it('returns true for a 400 illegal_argument_exception with sub-plan reason', () => {
      const error = makeResponseError(400, {
        error: {
          type: 'illegal_argument_exception',
          reason: SUB_PLAN_REASON,
        },
      });
      expect(isEsqlSubPlanTooLargeError(error)).toBe(true);
    });
  });

  describe('non-matching cases', () => {
    it('returns false for a 503 with the sub-plan reason', () => {
      const error = makeResponseError(503, {
        error: { type: 'illegal_argument_exception', reason: SUB_PLAN_REASON },
      });
      expect(isEsqlSubPlanTooLargeError(error)).toBe(false);
    });

    it('returns false for a 400 illegal_argument_exception with a different reason', () => {
      const error = makeResponseError(400, {
        error: {
          type: 'illegal_argument_exception',
          reason: 'field [foo] of type [keyword] does not support scripting',
        },
      });
      expect(isEsqlSubPlanTooLargeError(error)).toBe(false);
    });

    it('returns false for a 400 with a different error type but matching reason', () => {
      const error = makeResponseError(400, {
        error: {
          type: 'verification_exception',
          reason: SUB_PLAN_REASON,
        },
      });
      expect(isEsqlSubPlanTooLargeError(error)).toBe(false);
    });

    it('returns false for a 400 with no body', () => {
      const error = makeResponseError(400);
      expect(isEsqlSubPlanTooLargeError(error)).toBe(false);
    });

    it('returns false for a plain Error', () => {
      expect(isEsqlSubPlanTooLargeError(new Error(SUB_PLAN_REASON))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isEsqlSubPlanTooLargeError(null)).toBe(false);
    });
  });
});
