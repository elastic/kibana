/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateView } from '@kbn/adaptive-ui';
import { createAdaptiveUiViewRegistry } from '.';
import { registeredViewIds } from '../../common/constants';

const liveEvent = {
  event_id: 'evt-003',
  event_uuid: 'evt-003-v1',
  title: 'Elasticsearch cluster — disk watermark write throttling',
  summary: 'Disk usage crossed the 85% high watermark.',
  status: 'open',
  severity: '80-critical',
  confidence: 0.91,
  stream_names: ['logs.elasticsearch'],
  symptom_hypothesis: 'ILM retention misconfiguration left long-lived indices active.',
};

describe('streams.significantEvent registered view', () => {
  it('builds a live event card from the canonical payload', async () => {
    const registry = createAdaptiveUiViewRegistry();
    const response = await registry.request(
      registeredViewIds.significantEvent,
      undefined,
      liveEvent
    );
    expect(response.validation.valid).toBe(true);
    expect(validateView(response.spec)).toEqual(expect.objectContaining({ valid: true }));
    expect(response.spec.title).toBe(liveEvent.title);
    expect(JSON.stringify(response.spec)).toContain('View in Nightshift');
    expect(JSON.stringify(response.spec)).not.toContain('payment-service');
  });

  it('rejects a partial overlay instead of filling from sample data', async () => {
    const registry = createAdaptiveUiViewRegistry();
    await expect(
      registry.request(registeredViewIds.significantEvent, undefined, { event_id: 'evt-003' })
    ).rejects.toThrow(/live significant event/);
  });
});
