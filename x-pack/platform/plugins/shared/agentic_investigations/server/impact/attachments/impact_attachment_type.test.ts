/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Impact } from '../../../common/impact/impact';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { ImpactService } from '../services/impact_service';
import type { ImpactDocument, ImpactStorageClient } from '../storage/impact_storage';
import { formatImpactForAgent, impactAttachment } from './impact_attachment_type';

const legacyImpact: Impact = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  entities: [{ id: 'host-1', name: 'fin-dc-01', type: 'host' }],
  createdAt: '2026-09-01T00:00:00.000Z',
};

const agentImpact: Impact = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  summary: 'Checkout failed for 12% of users for 20 minutes.',
  evidence: {
    description: 'Errors rose right after the deploy.',
    chart: {
      type: 'line',
      title: 'Checkout error rate',
      x_axis: { type: 'time' },
      y_axis: { unit: 'percent' },
      series: [
        {
          name: 'checkout',
          points: [
            { x: '2026-07-28T14:00:00Z', y: 1 },
            { x: '2026-07-28T14:05:00Z', y: 12 },
          ],
        },
      ],
      annotations: [{ x: '2026-07-28T14:01:00Z', label: 'Deploy v2.3.1' }],
    },
  },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:10:00.000Z',
};

const attachmentType = () =>
  impactAttachment.createAttachmentType({
    getService: () =>
      new ImpactService({
        storage: createInMemoryStorage<ImpactDocument>() as unknown as ImpactStorageClient,
      }).getDocumentService(),
    logger: loggerMock.create(),
  });

describe('investigation_impact attachment type', () => {
  it('is the readonly investigation_impact type', () => {
    const definition = attachmentType();

    expect(definition.id).toBe(IMPACT_ATTACHMENT_TYPE);
    expect(definition.isReadonly).toBe(true);
  });

  it('is hidden in the conversation and not rendered inline', async () => {
    expect(impactAttachment.hiddenInConversation).toBe(true);
    expect(await attachmentType().getAgentDescription?.()).not.toContain('render_attachment');
  });

  it('accepts documents written before summary and evidence existed and those written after', async () => {
    const definition = attachmentType();

    expect(await definition.validate(legacyImpact)).toEqual({ valid: true, data: legacyImpact });
    expect(await definition.validate(agentImpact)).toEqual({ valid: true, data: agentImpact });
  });

  it('rejects an oversized chart', async () => {
    const definition = attachmentType();
    const points = Array.from({ length: 101 }, (_, index) => ({ x: `${index}`, y: index }));

    expect(
      await definition.validate({
        ...agentImpact,
        evidence: {
          chart: {
            type: 'bar',
            title: 'Too many points',
            x_axis: { type: 'category' },
            y_axis: {},
            series: [{ name: 'a', points }],
          },
        },
      })
    ).toMatchObject({ valid: false });
  });
});

describe('formatImpactForAgent', () => {
  it('lists entities of a document without a summary', () => {
    expect(formatImpactForAgent(legacyImpact)).toBe(
      [
        '## Investigation impact',
        'Conversation: conv-1',
        'Entities:',
        '- host-1 (fin-dc-01, host)',
      ].join('\n')
    );
  });

  it('summarizes the summary, evidence, and chart without raw points', () => {
    const formatted = formatImpactForAgent({
      ...agentImpact,
      entities: [{ id: 'svc-a', evidence: { description: 'Latency doubled.' } }],
    });

    expect(formatted).toContain('Summary: Checkout failed for 12% of users for 20 minutes.');
    expect(formatted).toContain('Errors rose right after the deploy.');
    expect(formatted).toContain(
      'Chart "Checkout error rate" (line, time x axis (percent)): checkout: 2 points, 1 to 12'
    );
    expect(formatted).toContain('Annotations: Deploy v2.3.1 at 2026-07-28T14:01:00Z');
    expect(formatted).toContain('- svc-a\n  Latency doubled.');
    expect(formatted).not.toContain('14:05');
  });
});
