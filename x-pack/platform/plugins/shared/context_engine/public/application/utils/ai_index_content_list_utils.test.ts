/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import {
  AI_INDICES_PER_PAGE,
  createFindAiIndices,
  filterAiIndicesBySearch,
} from './ai_index_content_list_utils';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'index', value: 'ai-index-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const buildAiIndexes = (count: number) =>
  Array.from({ length: count }, (_, index) => buildAiIndex({ id: `ai-index-${index}` }));

describe('filterAiIndicesBySearch', () => {
  const aiIndices = [
    buildAiIndex({ id: 'support-tickets', description: 'Escalation playbooks' }),
    buildAiIndex({ id: 'sales-outreach', dest: { type: 'index', value: 'ai-index-crm' } }),
  ];

  it('matches on id', () => {
    expect(filterAiIndicesBySearch(aiIndices, 'support').map(({ id }) => id)).toEqual([
      'support-tickets',
    ]);
  });

  it('matches on description', () => {
    expect(filterAiIndicesBySearch(aiIndices, 'escalation').map(({ id }) => id)).toEqual([
      'support-tickets',
    ]);
  });

  it('matches on the backing index name', () => {
    expect(filterAiIndicesBySearch(aiIndices, 'ai-index-crm').map(({ id }) => id)).toEqual([
      'sales-outreach',
    ]);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(filterAiIndicesBySearch(aiIndices, '  SUPPORT  ').map(({ id }) => id)).toEqual([
      'support-tickets',
    ]);
  });

  it('treats a whitespace-only query as no filter', () => {
    expect(filterAiIndicesBySearch(aiIndices, '   ')).toHaveLength(2);
  });

  it('normalizes ContentList search text before matching hyphenated destination values', () => {
    const aiIndex = buildAiIndex({
      id: 'logs-index',
      dest: { type: 'index', value: 'logs-custom-index' },
    });

    expect(filterAiIndicesBySearch([aiIndex], 'logs-custom-index').map(({ id }) => id)).toEqual([
      'logs-index',
    ]);
    expect(filterAiIndicesBySearch([aiIndex], 'logs-custom -index').map(({ id }) => id)).toEqual([
      'logs-index',
    ]);
    expect(filterAiIndicesBySearch([aiIndex], 'logs\\-custom\\-index').map(({ id }) => id)).toEqual(
      ['logs-index']
    );
  });
});

describe('createFindAiIndices', () => {
  it('returns every AI index unfiltered for an empty search query', async () => {
    const findItems = createFindAiIndices(buildAiIndexes(3));
    const { total, hits } = await findItems('');

    expect(total).toBe(3);
    expect(hits).toHaveLength(3);
  });

  it('filters by search query before mapping to content list items', async () => {
    const findItems = createFindAiIndices([
      buildAiIndex({ id: 'alpha' }),
      buildAiIndex({ id: 'beta' }),
    ]);

    const { total, hits } = await findItems('alpha');

    expect(total).toBe(1);
    expect(hits[0]?.id).toBe('alpha');
  });

  it(`maps ${AI_INDICES_PER_PAGE + 1} items without truncating`, async () => {
    const findItems = createFindAiIndices(buildAiIndexes(AI_INDICES_PER_PAGE + 1));
    const { total } = await findItems('');

    expect(total).toBe(AI_INDICES_PER_PAGE + 1);
  });
});
