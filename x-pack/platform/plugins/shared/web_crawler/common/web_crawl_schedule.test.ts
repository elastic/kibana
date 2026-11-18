/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { WebCrawlScheduleRequest } from './types';
import { WEB_CRAWL_WORKFLOW_TAG, buildWebCrawlWorkflowYaml } from './web_crawl_schedule';
import { WEB_CRAWL_STEP_ID, webCrawlStepInputSchema } from './web_crawl_step';

const CRAWL_URL = 'https://www.elastic.co/docs';

const REQUEST: WebCrawlScheduleRequest = {
  url: CRAWL_URL,
  maxDepth: 3,
  maxDocuments: 250,
  every: 1,
  unit: 'd',
};

interface ParsedWorkflow {
  version: string;
  name: string;
  description: string;
  enabled: boolean;
  tags: string[];
  triggers: Array<{ type: string; with?: Record<string, unknown> }>;
  steps: Array<{ name: string; type: string; with: Record<string, unknown> }>;
}

const parse = (yaml: string): ParsedWorkflow => {
  const result = parseYamlToJSONWithoutValidation(yaml);
  if (!result.success) {
    throw result.error;
  }
  expect(result.document.errors).toEqual([]);
  return result.json as unknown as ParsedWorkflow;
};

const build = (overrides: Partial<WebCrawlScheduleRequest> = {}): ParsedWorkflow =>
  parse(buildWebCrawlWorkflowYaml({ ...REQUEST, ...overrides }));

describe('buildWebCrawlWorkflowYaml', () => {
  it('builds an enabled workflow that crawls the site on a schedule and on demand', () => {
    expect(build()).toEqual({
      version: '1',
      name: `Web crawl: ${CRAWL_URL}`,
      description: `Crawls ${CRAWL_URL} every 1d. Created from the web crawls page.`,
      enabled: true,
      tags: ['web-crawl'],
      triggers: [{ type: 'scheduled', with: { every: '1d' } }, { type: 'manual' }],
      steps: [
        {
          name: 'crawl',
          type: 'webCrawl.run',
          with: { url: CRAWL_URL, max_depth: 3, max_documents: 250 },
        },
      ],
    });
  });

  it('tags the workflow so the crawl page can list it', () => {
    expect(build().tags).toEqual([WEB_CRAWL_WORKFLOW_TAG]);
  });

  it('runs the crawl step', () => {
    const [step] = build().steps;

    expect(step.type).toBe(WEB_CRAWL_STEP_ID);
    expect(webCrawlStepInputSchema.safeParse(step.with).success).toBe(true);
  });

  it.each([
    [1, 'h', '1h'],
    [12, 'h', '12h'],
    [7, 'd', '7d'],
  ] as const)('repeats every %i%s', (every, unit, expected) => {
    const { triggers, description } = build({ every, unit });

    expect(triggers[0]).toEqual({ type: 'scheduled', with: { every: expected } });
    expect(description).toContain(`every ${expected}.`);
  });

  it('leaves out the limits that were not requested', () => {
    const [{ with: input }] = build({ maxDepth: undefined, maxDocuments: undefined }).steps;

    expect(input).toEqual({ url: CRAWL_URL });
    expect(buildWebCrawlWorkflowYaml({ url: CRAWL_URL, every: 1, unit: 'd' })).not.toMatch(
      /max_depth|max_documents/
    );
  });

  it('leaves out each limit independently', () => {
    expect(build({ maxDocuments: undefined }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
    });
    expect(build({ maxDepth: undefined }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_documents: 250,
    });
  });

  it('keeps a depth of zero', () => {
    expect(build({ maxDepth: 0 }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 0,
      max_documents: 250,
    });
  });

  it('writes the limits as numbers', () => {
    const [{ with: input }] = build().steps;

    expect(typeof input.max_depth).toBe('number');
    expect(typeof input.max_documents).toBe('number');
  });

  it.each([
    'https://example.com/a: b',
    'https://example.com/#fragment',
    'https://example.com/?q=[1,2]&filter={a:b}',
    'https://example.com/path?x=1&y=*&z=!important',
    `https://example.com/it's "quoted"`,
    'https://example.com/{{ inputs.secret }}',
    'https://example.com/a | b > c',
    'https://example.com/%20%0A- injected: true',
    'https://example.com/\nsteps: []',
    'https://example.com/ trailing ',
    'https://例え.jp/パス',
  ])('round-trips the URL %p', (url) => {
    const { name, description, steps, triggers } = build({ url });

    expect(steps).toHaveLength(1);
    expect(triggers).toHaveLength(2);
    expect(steps[0].with.url).toBe(url);
    expect(name).toBe(`Web crawl: ${url}`);
    expect(description).toBe(`Crawls ${url} every 1d. Created from the web crawls page.`);
  });
});
