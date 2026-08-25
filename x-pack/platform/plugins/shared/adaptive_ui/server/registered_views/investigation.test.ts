/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateView } from '@kbn/adaptive-ui';
import { createAdaptiveUiViewRegistry } from '.';
import { registeredViewIds } from '../../common/constants';

const liveInvestigation = {
  investigation_id: 'inv-003',
  event_id: 'evt-003',
  status: 'completed',
  summary: 'Investigate disk watermark write throttling on logs.elasticsearch.',
  conclusion: 'ILM retention misconfiguration left long-lived indices active.',
  recommendations: [
    {
      title: 'Restore the missing ILM policy',
      description: 'Attach a delete phase at 30 days.',
    },
  ],
  blind_spots: [
    {
      title: 'No hot/warm allocation metrics',
      description: 'Node disk stats are sampled without per-index breakdown.',
    },
  ],
  hypotheses: [
    {
      candidate: 'ILM retention misconfiguration left long-lived indices active',
      confidence: 0.91,
      status: 'confirmed' as const,
    },
  ],
};

describe('nightshift.investigation registered view', () => {
  it('builds a live investigation card from structured findings', async () => {
    const registry = createAdaptiveUiViewRegistry();
    const response = await registry.request(
      registeredViewIds.investigation,
      undefined,
      liveInvestigation
    );
    expect(response.validation.valid).toBe(true);
    expect(validateView(response.spec)).toEqual(expect.objectContaining({ valid: true }));
    expect(response.spec.title).toContain('ILM retention');
    expect(JSON.stringify(response.spec)).toContain('Restore the missing ILM policy');
    expect(JSON.stringify(response.spec)).not.toContain('payment-service');
  });

  it('rejects omitted input instead of rendering sample data', async () => {
    const registry = createAdaptiveUiViewRegistry();
    await expect(registry.request(registeredViewIds.investigation, undefined)).rejects.toThrow(
      /live investigation/
    );
  });
});
