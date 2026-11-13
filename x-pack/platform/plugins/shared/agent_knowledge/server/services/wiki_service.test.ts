/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  ALERTZERO_WIKI_AI_INDEX_ID,
  ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
  ALERTZERO_WIKI_ENTITY_TYPES,
  ALERTZERO_WIKI_SECTIONS_BY_TYPE,
} from '@kbn/agent-knowledge-common';
import { createTypePackRegistry } from './type_pack_registry';
import { createWikiService } from './wiki_service';

describe('createWikiService', () => {
  const logger = loggerMock.create();

  it('recalls matching pages as markdown context', async () => {
    const typePacks = createTypePackRegistry({ logger });
    typePacks.register({
      product: 'alertzero',
      entityTypes: ALERTZERO_WIKI_ENTITY_TYPES,
      sectionsByType: ALERTZERO_WIKI_SECTIONS_BY_TYPE,
      bucketsByType: ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
    });
    typePacks.bindAiIndex(ALERTZERO_WIKI_AI_INDEX_ID, 'alertzero');

    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'default:wiki_detection_rule_suspicious-powershell',
            _source: {
              '@timestamp': '2026-11-13T00:00:00.000Z',
              type: 'detection_rule',
              title: 'Suspicious PowerShell',
              content: '## Known benign\n- svc_backup',
              tags: ['wiki', 'detection_rule'],
              attributes: {
                status: 'established',
                corroborations: 1,
                slug: 'suspicious-powershell',
                space_id: 'default',
              },
            },
          },
        ],
      },
    });
    const get = jest.fn().mockResolvedValue({
      found: true,
      _id: 'default:wiki_detection_rule_suspicious-powershell',
      _source: {
        '@timestamp': '2026-11-13T00:00:00.000Z',
        type: 'detection_rule',
        title: 'Suspicious PowerShell',
        content: '## Known benign\n- svc_backup',
        tags: ['wiki', 'detection_rule'],
        attributes: {
          status: 'established',
          corroborations: 1,
          slug: 'suspicious-powershell',
          space_id: 'default',
        },
      },
      _seq_no: 1,
      _primary_term: 1,
    });

    const service = createWikiService({
      esClient: { search, get } as never,
      logger,
      typePacks,
    });

    const result = await service.recall({
      aiIndexId: ALERTZERO_WIKI_AI_INDEX_ID,
      spaceId: 'default',
      entityTypes: ['detection_rule'],
      slugs: ['suspicious-powershell'],
      limit: 5,
    });

    expect(result.pages).toHaveLength(1);
    expect(result.context_markdown).toContain('Suspicious PowerShell');
    expect(result.context_markdown).toContain('svc_backup');
  });

  it('skips lint-blocking upserts on record', async () => {
    const typePacks = createTypePackRegistry({ logger });
    typePacks.register({
      product: 'alertzero',
      entityTypes: ALERTZERO_WIKI_ENTITY_TYPES,
      sectionsByType: ALERTZERO_WIKI_SECTIONS_BY_TYPE,
      bucketsByType: ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
    });
    typePacks.bindAiIndex(ALERTZERO_WIKI_AI_INDEX_ID, 'alertzero');

    const service = createWikiService({
      esClient: {
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
        get: jest.fn().mockRejectedValue(Object.assign(new Error('missing'), { statusCode: 404 })),
        index: jest.fn(),
      } as never,
      logger,
      typePacks,
    });

    const result = await service.record({
      aiIndexId: ALERTZERO_WIKI_AI_INDEX_ID,
      spaceId: 'default',
      edits: [
        {
          action: 'upsert',
          entity_type: 'detection_rule',
          slug: 'rule',
          title: 'Rule',
          content: 'Seen at 2026-01-01 on alert abcdef12-3456-7890-abcd-ef1234567890',
        },
      ],
    });

    expect(result.applied).toEqual([]);
    expect(result.skipped[0]?.reason).toMatch(/^lint:/);
  });
});
