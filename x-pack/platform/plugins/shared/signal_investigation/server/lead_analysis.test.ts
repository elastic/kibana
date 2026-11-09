/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { SignalAnalyzer } from '@kbn/signal-investigation-contract';
import { runLeadAnalysis, type SignalInvestigationLicense } from './lead_analysis';

const seed = {
  origin: { app: 'alerts' as const, alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
} satisfies InvestigationSeed;

const license = (active: boolean, level: 'basic' | 'platinum'): SignalInvestigationLicense => ({
  isActive: active,
  hasAtLeast: (minimum) => minimum === 'platinum' && level === 'platinum',
});

const analyzer = (run: SignalAnalyzer['run']): SignalAnalyzer => ({
  id: 'service_change_points',
  displayName: 'Service change points',
  authz: 'apm',
  getApplicability: () => ({ applicable: true }),
  run,
});

const deps = {} as Parameters<typeof runLeadAnalysis>[0]['deps'];

describe('runLeadAnalysis', () => {
  it('returns forbidden below an active Platinum license and does not run the analyzer', async () => {
    const run = jest.fn();
    const outcome = await runLeadAnalysis({
      analyzer: analyzer(run),
      seed,
      deps,
      abortSignal: new AbortController().signal,
      license: license(true, 'basic'),
    });

    expect(run).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      kind: 'forbidden',
      message: 'Find related changes requires an active Platinum license.',
    });
  });

  it('turns an Elasticsearch 403 into no access', async () => {
    const error = new errors.ResponseError({
      statusCode: 403,
      headers: {},
      warnings: [],
      meta: {} as never,
      body: { error: { type: 'security_exception' } },
    });
    const outcome = await runLeadAnalysis({
      analyzer: analyzer(async () => {
        throw error;
      }),
      seed,
      deps,
      abortSignal: new AbortController().signal,
      license: license(true, 'platinum'),
    });

    expect(outcome).toEqual({
      kind: 'ok',
      body: {
        leads: [],
        entities: {},
        status: 'no_access',
      },
    });
  });

  it('turns a forbidden saved object lookup into no access', async () => {
    const outcome = await runLeadAnalysis({
      analyzer: analyzer(async () => {
        throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('nope'));
      }),
      seed,
      deps,
      abortSignal: new AbortController().signal,
      license: license(true, 'platinum'),
    });

    expect(outcome).toEqual({
      kind: 'ok',
      body: { leads: [], entities: {}, status: 'no_access' },
    });
  });

  it('turns an aborted request into a closed outcome', async () => {
    const outcome = await runLeadAnalysis({
      analyzer: analyzer(async () => {
        throw new errors.RequestAbortedError('Request aborted');
      }),
      seed,
      deps,
      abortSignal: new AbortController().signal,
      license: license(true, 'platinum'),
    });

    expect(outcome).toEqual({ kind: 'closed' });
  });

  it('rethrows an unexpected analyzer failure', async () => {
    await expect(
      runLeadAnalysis({
        analyzer: analyzer(async () => {
          throw new Error('analysis failed');
        }),
        seed,
        deps,
        abortSignal: new AbortController().signal,
        license: license(true, 'platinum'),
      })
    ).rejects.toThrow('analysis failed');
  });
});
