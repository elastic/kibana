/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nightshiftInvestigationsRouteRepository } from '.';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
} from '../client/errors';

const endpoint = 'PATCH /internal/nightshift/investigations/{id}' as const;
const { handler, params } = nightshiftInvestigationsRouteRepository[endpoint];
const mockRequest = {} as KibanaRequest;

const parseBody = (body: Record<string, unknown>) =>
  params.parse({ path: { id: 'exec-1' }, body }).body;

const makeResources = (body: Record<string, unknown>, update = jest.fn()) => ({
  request: mockRequest,
  params: { path: { id: 'exec-1' }, body },
  getInvestigationsClient: jest.fn().mockReturnValue({ update }),
});

describe('updateInvestigation body schema', () => {
  // The workflow interpolates missing structured output as `""` (quoted fields) or `null`
  // (unquoted ones), so absence has to survive validation rather than fail it.
  it('treats the empty strings a completed run sends for missing fields as absent', () => {
    expect(
      parseBody({
        status: 'completed',
        summary: 'Disk filled up.',
        conclusion: '',
        severity: '',
        conversation_id: '',
      })
    ).toEqual({
      status: 'completed',
      summary: 'Disk filled up.',
      conclusion: undefined,
      severity: undefined,
      conversation_id: undefined,
      error: undefined,
      hypotheses: undefined,
      recommendations: undefined,
      blind_spots: undefined,
      trigger_feedback: undefined,
      impact: undefined,
    });
  });

  it('treats null from an unquoted interpolation as absent', () => {
    expect(
      parseBody({ status: 'completed', hypotheses: null, impact: null, trigger_feedback: null })
    ).toEqual(
      expect.objectContaining({
        hypotheses: undefined,
        impact: undefined,
        trigger_feedback: undefined,
      })
    );
  });

  it('passes a fully populated structured output through', () => {
    const body = {
      status: 'completed',
      summary: 'Disk filled up.',
      conclusion: 'Log rotation was disabled.',
      severity: '60-high',
      hypotheses: [{ candidate: 'Log rotation disabled', confidence: 0.9, status: 'confirmed' }],
      recommendations: [{ title: 'Re-enable log rotation' }],
      blind_spots: [{ title: 'No metrics', description: 'Host metrics were not shipped.' }],
      impact: { entities: [] },
      conversation_id: 'conv-1',
    };

    expect(parseBody(body)).toEqual(expect.objectContaining(body));
  });

  it('still rejects a severity outside the canonical tiers', () => {
    expect(() => parseBody({ status: 'completed', severity: 'catastrophic' })).toThrow();
  });

  it('rejects a status the write path does not accept', () => {
    expect(() => parseBody({ status: 'pending' })).toThrow();
  });
});

describe('updateInvestigation handler', () => {
  it('forwards the validated body to the client', async () => {
    const update = jest.fn();
    const body = { status: 'failed', error: 'Agent timed out' };

    await expect(handler(makeResources(body, update) as never)).resolves.toEqual({
      acknowledged: true,
    });
    expect(update).toHaveBeenCalledWith('exec-1', body);
  });

  it.each([
    ['a missing investigation', 404, () => new InvestigationNotFoundError('exec-1')],
    ['an execution without a subject', 400, () => new InvestigationSubjectMissingError('exec-1')],
    [
      'a settled investigation',
      409,
      () => InvestigationConflictError.settled('exec-1', 'completed'),
    ],
  ])('reports %s as %i', async (_label, statusCode, makeError) => {
    const update = jest.fn().mockRejectedValue(makeError());

    await expect(
      handler(makeResources({ status: 'completed' }, update) as never)
    ).rejects.toMatchObject({ output: { statusCode } });
  });
});
