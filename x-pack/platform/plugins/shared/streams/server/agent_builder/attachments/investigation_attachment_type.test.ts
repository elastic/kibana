/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import {
  hashContent,
  type VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import type { InvestigationResult } from '@kbn/streams-schema';
import { INVESTIGATION_ATTACHMENT_TYPE } from '../../../common';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import {
  createInvestigationAttachmentType,
  formatInvestigationAsText,
} from './investigation_attachment_type';

const investigation: InvestigationResult = {
  root_cause: 'Payment gateway timeout caused by connection pool exhaustion.',
  confidence: 0.85,
  impact: 'Critical — checkout flow unavailable for 12 minutes.',
  ranked_hypotheses: [
    {
      rank: 1,
      hypothesis_id: 'dep-rollout',
      statement: 'Bad deploy to payments-svc at 14:23 introduced a blocking DB query.',
      verdict: 'supported',
      prior_confidence: 0.7,
      posterior_confidence: 0.9,
      evidence_summary: 'ES|QL query confirmed spike in DB latency at 14:23, matching deploy time.',
    },
  ],
  discarded_hypotheses: [],
  remediation_options: [
    {
      rank: 1,
      action: 'Roll back payments-svc to the previous version.',
      rationale:
        'Deploy at 14:23 correlates with latency spike — rollback should restore normal latency.',
      risk_level: 'medium',
    },
  ],
  gaps_found: [],
  investigation_complete: true,
  memory_pages_written: ['payments-svc/incidents/2026-06-13'],
};

const createContext = (): AttachmentResolveContext => ({
  request: {} as KibanaRequest,
  spaceId: 'default',
});

const createGetScopedClients = (
  investigationData: InvestigationResult | undefined
): jest.MockedFunction<GetScopedClients> => {
  const getDiscoveryClient = jest.fn(() => ({
    findById: jest.fn().mockResolvedValue({
      hits: investigationData
        ? [
            {
              '@timestamp': '2026-06-13T14:00:00.000Z',
              kind: 'finding' as const,
              discovery_id: 'disc-1',
              discovery_slug: 'payment-outage',
              rule_names: [],
              stream_names: ['logs.payment'],
              title: 'Payment outage',
              summary: 'Payments failing.',
              root_cause: 'Unknown.',
              criticality: 90,
              confidence: 0.8,
              impact: 'high',
              detections: [],
              investigation: {
                completed_at: '2026-06-13T14:45:00.000Z',
                workflow_execution_id: 'exec-1',
                ...investigationData,
              },
            },
          ]
        : [],
    }),
  }));

  return jest.fn().mockResolvedValue({
    getDiscoveryClient,
  } as unknown as RouteHandlerScopedClients) as jest.MockedFunction<GetScopedClients>;
};

const createVersionedAttachment = (
  data: InvestigationResult
): VersionedAttachmentWithOrigin<typeof INVESTIGATION_ATTACHMENT_TYPE, InvestigationResult> => ({
  id: 'attachment-1',
  type: INVESTIGATION_ATTACHMENT_TYPE,
  origin: 'disc-1',
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: '2026-06-13T14:00:00.000Z',
      content_hash: hashContent(data),
    },
  ],
});

describe('createInvestigationAttachmentType', () => {
  it('validates a valid investigation result', async () => {
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(undefined),
    });

    await expect(Promise.resolve(type.validate(investigation))).resolves.toEqual({
      valid: true,
      data: investigation,
    });
    await expect(Promise.resolve(type.validate({ missing: 'required fields' }))).resolves.toEqual(
      expect.objectContaining({ valid: false })
    );
  });

  it('resolves investigation from discovery by discovery_id', async () => {
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(investigation),
    });

    const resolved = await type.resolve?.('disc-1', createContext());
    expect(resolved).toMatchObject({ root_cause: investigation.root_cause });
  });

  it('returns undefined when the discovery has no investigation', async () => {
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(undefined),
    });

    await expect(type.resolve?.('disc-1', createContext())).resolves.toBeUndefined();
  });

  it('does not report stale when the investigation is unchanged', async () => {
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(investigation),
    });

    await expect(
      type.isStale?.(createVersionedAttachment(investigation), createContext())
    ).resolves.toBe(false);
  });

  it('reports stale when investigation confidence changes', async () => {
    const updatedInvestigation = { ...investigation, confidence: 0.95 };
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(updatedInvestigation),
    });

    await expect(
      type.isStale?.(createVersionedAttachment(investigation), createContext())
    ).resolves.toBe(true);
  });

  it('formats useful LLM text', () => {
    const text = formatInvestigationAsText(investigation);

    expect(text).toContain('Payment gateway timeout');
    expect(text).toContain('Bad deploy to payments-svc');
    expect(text).toContain('Roll back payments-svc');
  });

  it('exposes correct metadata', () => {
    const type = createInvestigationAttachmentType({
      logger: loggingSystemMock.createLogger(),
      getScopedClients: createGetScopedClients(undefined),
    });

    expect(type.isReadonly).toBe(true);
    expect(type.getTools?.()).toEqual([]);
    expect(type.getAgentDescription?.()).toContain('investigation');
  });
});
