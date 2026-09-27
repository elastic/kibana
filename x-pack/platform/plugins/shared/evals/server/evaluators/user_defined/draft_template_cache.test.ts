/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { withUncachedTemplates } from './draft_template_cache';

const DRAFT = 'Rate {{{agent_response}}} as a draft';
const PERSISTED = 'Rate {{{agent_response}}} as a saved evaluator';

const isCached = (template: string): boolean =>
  Mustache.templateCache?.get(`${template}:{{:}}`) !== undefined;

describe('draft template cache', () => {
  beforeEach(() => {
    Mustache.clearCache();
  });

  it('keeps a draft rendered under test out of the shared cache', async () => {
    await withUncachedTemplates([DRAFT], async () => {
      Mustache.render(DRAFT, { agent_response: 'answer' });
    });

    expect(isCached(DRAFT)).toBe(false);
  });

  it('still renders the draft correctly', async () => {
    const rendered = await withUncachedTemplates([DRAFT], async () =>
      Mustache.render(DRAFT, { agent_response: 'answer' })
    );

    expect(rendered).toBe('Rate answer as a draft');
  });

  it('leaves other templates cached while a draft is under test', async () => {
    Mustache.render(PERSISTED, { agent_response: 'answer' });

    await withUncachedTemplates([DRAFT], async () => {
      Mustache.render(DRAFT, { agent_response: 'answer' });
      // Rendered during the run, so this proves the hold is scoped to the draft rather
      // than disabling the cache outright.
      Mustache.render(`${PERSISTED} two`, { agent_response: 'answer' });
    });

    expect(isCached(PERSISTED)).toBe(true);
    expect(isCached(`${PERSISTED} two`)).toBe(true);
  });

  it('caches the same text again once no run holds it', async () => {
    await withUncachedTemplates([DRAFT], async () => {
      Mustache.render(DRAFT, { agent_response: 'answer' });
    });

    // The hold is released, so an identical persisted template is cacheable as normal.
    Mustache.render(DRAFT, { agent_response: 'answer' });

    expect(isCached(DRAFT)).toBe(true);
  });

  it('holds the draft until the last concurrent run releases it', async () => {
    let releaseFirst: () => void = () => {};
    const first = withUncachedTemplates([DRAFT], async () => {
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
    });

    // A second run of the same draft finishes first; the hold has to survive it.
    await withUncachedTemplates([DRAFT], async () => {
      Mustache.render(DRAFT, { agent_response: 'answer' });
    });
    Mustache.render(DRAFT, { agent_response: 'answer' });
    expect(isCached(DRAFT)).toBe(false);

    releaseFirst();
    await first;

    Mustache.render(DRAFT, { agent_response: 'answer' });
    expect(isCached(DRAFT)).toBe(true);
  });

  it('releases the hold when the run throws', async () => {
    await expect(
      withUncachedTemplates([DRAFT], async () => {
        throw new Error('judge failed');
      })
    ).rejects.toThrow('judge failed');

    Mustache.render(DRAFT, { agent_response: 'answer' });
    expect(isCached(DRAFT)).toBe(true);
  });
});
