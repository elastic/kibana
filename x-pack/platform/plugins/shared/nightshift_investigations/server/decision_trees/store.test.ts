/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { CortexPage } from '../../common/cortex';
import type { CortexPageStore } from '../cortex/page_store';
import { createDecisionTreeStore, cortexSlugForSymptom, symptomFromCortexSlug } from './store';

const MARKDOWN = `# Checkout high latency

\`\`\`mermaid
flowchart TD
    S1([Checkout latency]) -->|✅| E1[Query logs]
    E1 --> X1((Pool exhausted))
\`\`\`
`;

const page = (overrides: Partial<CortexPage> = {}): CortexPage => ({
  id: 'cortex_runbook_decision-tree-checkout-high-latency',
  title: 'Checkout High Latency',
  entity_type: 'runbook',
  status: 'tentative',
  corroborations: 1,
  updated_at: '2026-09-09T12:00:00.000Z',
  slug: 'decision-tree-checkout-high-latency',
  content: MARKDOWN,
  ...overrides,
});

const createPageStore = (overrides: Partial<CortexPageStore> = {}): jest.Mocked<CortexPageStore> =>
  ({
    list: jest.fn().mockResolvedValue({ pages: [], stats: { total: 0 } }),
    get: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockImplementation(async (input) => page({ content: input.content })),
    corroborate: jest.fn().mockResolvedValue(page()),
    archive: jest.fn().mockResolvedValue(page()),
    pruneDuplicates: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as jest.Mocked<CortexPageStore>);

const createStore = (pageStore: CortexPageStore) =>
  createDecisionTreeStore({ pageStore, logger: loggerMock.create() });

describe('slug mapping', () => {
  it('round-trips a symptom through the cortex slug', () => {
    expect(symptomFromCortexSlug(cortexSlugForSymptom('checkout-high-latency'))).toBe(
      'checkout-high-latency'
    );
  });

  it('accepts a full tree id', () => {
    expect(cortexSlugForSymptom('symptom:checkout-high-latency')).toBe(
      'decision-tree-checkout-high-latency'
    );
  });

  it('leaves a non-decision-tree slug alone', () => {
    expect(symptomFromCortexSlug('checkout-service')).toBe('checkout-service');
  });
});

describe('list', () => {
  it('returns only runbook pages carrying the decision-tree prefix', async () => {
    const pageStore = createPageStore({
      list: jest.fn().mockResolvedValue({
        pages: [
          page(),
          page({
            id: 'cortex_runbook_oncall-escalation',
            slug: 'oncall-escalation',
            title: 'Oncall Escalation',
          }),
        ],
        stats: { total: 2 },
      }),
    });

    const trees = await createStore(pageStore).list();

    expect(pageStore.list).toHaveBeenCalledWith({ entityType: 'runbook' });
    expect(trees).toEqual([
      expect.objectContaining({
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        title: 'Checkout High Latency',
        status: 'tentative',
        corroborations: 1,
      }),
    ]);
  });
});

describe('get', () => {
  it('reads the page by its derived cortex id and extracts the mermaid', async () => {
    const pageStore = createPageStore({ get: jest.fn().mockResolvedValue(page()) });

    const tree = await createStore(pageStore).get('symptom:checkout-high-latency');

    expect(pageStore.get).toHaveBeenCalledWith(
      'cortex_runbook_decision-tree-checkout-high-latency'
    );
    expect(tree?.markdown).toBe(MARKDOWN);
    expect(tree?.mermaid).toContain('flowchart TD');
  });

  it('returns undefined when no page exists', async () => {
    expect(await createStore(createPageStore()).get('symptom:missing-tree')).toBeUndefined();
  });

  it('returns an empty mermaid rather than throwing on a corrupt stored page', async () => {
    const pageStore = createPageStore({
      get: jest.fn().mockResolvedValue(page({ content: 'no diagram here' })),
    });

    const tree = await createStore(pageStore).get('symptom:checkout-high-latency');

    expect(tree?.mermaid).toBe('');
    expect(tree?.markdown).toBe('no diagram here');
  });
});

describe('upsert', () => {
  it('writes the markdown under the prefixed runbook slug', async () => {
    const pageStore = createPageStore();

    await createStore(pageStore).upsert({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
    });

    expect(pageStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'runbook',
        slug: 'decision-tree-checkout-high-latency',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        status: 'tentative',
      })
    );
  });

  it('promotes the tree to established once a root cause is confirmed', async () => {
    const pageStore = createPageStore();

    await createStore(pageStore).upsert({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      reinforced: true,
    });

    expect(pageStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'established' })
    );
  });

  it('keeps an established tree established across an ordinary turn', async () => {
    const pageStore = createPageStore({
      get: jest.fn().mockResolvedValue(page({ status: 'established', corroborations: 4 })),
    });

    await createStore(pageStore).upsert({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
    });

    expect(pageStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'established', corroborations: 4 })
    );
  });

  it('derives a readable title from the symptom slug', async () => {
    const pageStore = createPageStore();

    await createStore(pageStore).upsert({ treeId: 'symptom:redis-evictions', markdown: MARKDOWN });

    expect(pageStore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Redis Evictions' })
    );
  });
});

describe('markVisited and archive', () => {
  it('corroborates the backing page', async () => {
    const pageStore = createPageStore();

    await createStore(pageStore).markVisited('symptom:checkout-high-latency');

    expect(pageStore.corroborate).toHaveBeenCalledWith(
      'cortex_runbook_decision-tree-checkout-high-latency'
    );
  });

  it('archives the backing page', async () => {
    const pageStore = createPageStore();

    await createStore(pageStore).archive('symptom:checkout-high-latency');

    expect(pageStore.archive).toHaveBeenCalledWith(
      'cortex_runbook_decision-tree-checkout-high-latency'
    );
  });
});
