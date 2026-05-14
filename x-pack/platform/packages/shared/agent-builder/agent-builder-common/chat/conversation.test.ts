/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from './conversation';
import { isHitlFormResponseFreshStepData, isHitlFormResponseStaleStepData } from './conversation';
import type {
  HitlFormResponseFreshStepData,
  HitlFormResponseStaleStepData,
  OtherStep,
  StaleSubmissionReason,
} from './conversation';

const makeFreshData = (
  overrides?: Partial<HitlFormResponseFreshStepData>
): HitlFormResponseFreshStepData => ({
  execution_id: 'exec-1',
  kind: 'hitl_form_response',
  step_execution_id: 'step-exec-1',
  submitted_at: '2026-05-19T00:00:00.000Z',
  values: { answer: 'yes' },
  ...overrides,
});

const makeStaleData = (
  overrides?: Partial<HitlFormResponseStaleStepData>
): HitlFormResponseStaleStepData => ({
  execution_id: 'exec-2',
  kind: 'hitl_form_response_stale',
  observed_status: 'completed',
  reason: 'workflow_already_resolved',
  step_execution_id: 'step-exec-2',
  submitted_at: '2026-05-19T00:00:00.000Z',
  submitted_values: { answer: 'no' },
  ...overrides,
});

describe('HitlFormResponseStepData discriminants', () => {
  describe('isHitlFormResponseFreshStepData', () => {
    it('returns true for kind=hitl_form_response', () => {
      const data = makeFreshData();

      expect(isHitlFormResponseFreshStepData(data)).toBe(true);
    });

    it('returns false for kind=hitl_form_response_stale', () => {
      const data = makeStaleData();

      expect(isHitlFormResponseFreshStepData(data)).toBe(false);
    });
  });

  describe('isHitlFormResponseStaleStepData', () => {
    it('returns true for kind=hitl_form_response_stale', () => {
      const data = makeStaleData();

      expect(isHitlFormResponseStaleStepData(data)).toBe(true);
    });

    it('returns false for kind=hitl_form_response', () => {
      const data = makeFreshData();

      expect(isHitlFormResponseStaleStepData(data)).toBe(false);
    });
  });

  describe('StaleSubmissionReason discriminant coverage', () => {
    const reasons: StaleSubmissionReason[] = [
      'concurrent_resume',
      'workflow_advanced',
      'workflow_already_resolved',
    ];

    it.each(reasons)(
      'stale step with reason=%s is detected by isHitlFormResponseStaleStepData',
      (reason) => {
        const data = makeStaleData({ reason });

        expect(isHitlFormResponseStaleStepData(data)).toBe(true);
      }
    );
  });

  describe('OtherStep wrapping', () => {
    it('an OtherStep wrapping fresh data has kind=hitl_form_response', () => {
      const step: OtherStep = {
        ...makeFreshData(),
        type: ConversationRoundStepType.other,
      };

      expect(isHitlFormResponseFreshStepData(step)).toBe(true);
    });

    it('an OtherStep wrapping stale data has kind=hitl_form_response_stale', () => {
      const step: OtherStep = {
        ...makeStaleData(),
        type: ConversationRoundStepType.other,
      };

      expect(isHitlFormResponseStaleStepData(step)).toBe(true);
    });
  });
});
