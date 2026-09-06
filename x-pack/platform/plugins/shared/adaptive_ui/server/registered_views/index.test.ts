/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registeredViewIds } from '../../common/constants';
import { createAdaptiveUiViewRegistry } from '.';

const liveEventInput = {
  event_id: 'evt-003',
  event_uuid: 'evt-003-v1',
  title: 'Elasticsearch cluster — disk watermark write throttling',
  summary: 'Disk usage crossed the 85% high watermark.',
  status: 'open',
  severity: '80-critical',
  confidence: 0.91,
  stream_names: ['logs.elasticsearch'],
};

describe('createAdaptiveUiViewRegistry', () => {
  it('registers the significant event and investigation views', () => {
    const registry = createAdaptiveUiViewRegistry();
    expect(registry.get(registeredViewIds.significantEvent)).toBeDefined();
    expect(registry.get(registeredViewIds.investigation)).toBeDefined();
    expect(registry.list().map((view) => view.id)).toEqual(
      expect.arrayContaining([registeredViewIds.significantEvent, registeredViewIds.investigation])
    );
  });

  it('does not render sample data when input is omitted', async () => {
    const registry = createAdaptiveUiViewRegistry();
    await expect(registry.request(registeredViewIds.significantEvent, undefined)).rejects.toThrow(
      /live significant event/
    );
  });

  it('builds from a live event payload without payment-service leftovers', async () => {
    const registry = createAdaptiveUiViewRegistry();
    const response = await registry.request(
      registeredViewIds.significantEvent,
      undefined,
      liveEventInput
    );
    expect(response.validation.valid).toBe(true);
    expect(response.spec.title).toBe(liveEventInput.title);
    expect(JSON.stringify(response.spec)).not.toContain('payment-service');
  });
});
