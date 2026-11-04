/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  appDocumentSchema,
  collectQueries,
  getInterpolatedText,
  resolveBoundProps,
  type AppNode,
} from '@kbn/custom-app-common';
import {
  checkCapability,
  defineCapability,
  describeCapability,
  registerCapability,
} from '@kbn/custom-app-registry';
import { lensChartCapability } from './manifest';

// The chart is checked in a page of its own, with the two components that a page needs around it.
const stack = defineCapability({
  kind: 'component',
  id: 'stack',
  version: 1,
  container: true,
  props: z.object({}),
  doc: { summary: 'Holds others.', whenToUse: 'Always.', example: { type: 'stack', id: 's' } },
});
const flyout = defineCapability({
  kind: 'component',
  id: 'flyout',
  version: 1,
  container: true,
  props: z.object({ title: z.string().describe('Its heading.') }),
  doc: {
    summary: 'A panel that opens on the side.',
    whenToUse: 'For details.',
    example: { type: 'flyout', id: 'f', title: 'More' },
  },
});

beforeAll(() => {
  registerCapability(stack);
  registerCapability(flyout);
  registerCapability(lensChartCapability);
});

const doc = (children: unknown[], state: Record<string, unknown> = {}) => ({
  state,
  root: { type: 'stack', id: 'root', children },
});
const nodeOf = (document: unknown, index = 0) =>
  (appDocumentSchema.parse(document).root as unknown as { children: AppNode[] }).children[index];

describe('the Lens chart capability', () => {
  it('has nothing wrong with it', () => {
    expect(checkCapability(lensChartCapability)).toEqual([]);
  });

  it('teaches clicking a chart: the actions, the row behind a bar and how to get back', () => {
    const line = describeCapability(lensChartCapability);
    expect(line).toContain('clicking a bar, a point or a slice runs the actions');
    expect(line).toContain('a chart split by a series gives both the bar and the series');
    expect(line).toContain('keep a way to clear the value');
  });
});

describe('binding in a chart', () => {
  it('can be inside another property, such as the annotations of a chart', () => {
    const chart = nodeOf(
      doc(
        [
          {
            type: 'chart',
            id: 'c',
            query: 'FROM d',
            annotations: { query: 'FROM e', time: 't', visible: { $state: 'show' } },
          },
        ],
        { show: { type: 'boolean', default: false } }
      )
    );

    expect(resolveBoundProps(chart, { show: true })).toMatchObject({
      annotations: { visible: true },
    });
    expect(resolveBoundProps(chart, { show: false })).toMatchObject({
      annotations: { visible: false },
    });
  });
});

describe('the annotations of a chart', () => {
  const chart = (annotations: unknown, state: Record<string, unknown> = {}) => ({
    state,
    root: { type: 'chart', id: 'trend', query: 'FROM logs | STATS c = COUNT(*)', annotations },
  });
  const messagesOf = (document: unknown) => {
    const result = appDocumentSchema.safeParse(document);
    return result.success ? [] : result.error.issues.map(({ message }) => message);
  };

  it('are a query of their own, the column of their time, and optionally their label and a switch', () => {
    expect(
      messagesOf(
        chart(
          { query: 'FROM deploys', time: '@timestamp', label: 'name', showWhen: 'show' },
          { show: { type: 'boolean', default: true } }
        )
      )
    ).toEqual([]);
  });

  it('need a query and a time column', () => {
    expect(messagesOf(chart({ time: '@timestamp' })).length).toBeGreaterThan(0);
    expect(messagesOf(chart({ query: 'FROM deploys' })).length).toBeGreaterThan(0);
  });

  it('are shown by a key that exists and is a true or a false', () => {
    expect(messagesOf(chart({ query: 'FROM d', time: 't', visible: { $state: 'show' } }))).toEqual([
      'Node "trend" reads "annotations.visible" from unknown state key "show"',
    ]);
    expect(
      messagesOf(
        chart(
          { query: 'FROM d', time: 't', visible: { $state: 'show' } },
          { show: { type: 'string', default: 'x' } }
        )
      )[0]
    ).toContain('it needs a boolean key');
  });
});

describe('what happens when a chart is clicked', () => {
  const chartDoc = (onClick: unknown[], state: Record<string, unknown> = {}) => ({
    state,
    root: {
      type: 'stack',
      id: 'root',
      children: [
        {
          type: 'chart',
          id: 'users-chart',
          query: 'FROM logs | STATS c = COUNT(*) BY user.name',
          onClick,
        },
        { type: 'flyout', id: 'more', title: 'More', children: [] },
      ],
    },
  });
  const issues = (document: unknown) =>
    JSON.stringify(appDocumentSchema.safeParse(document).error?.issues ?? []);
  const remember = { type: 'setState', key: 'user', value: { fromColumn: 'user.name' } };
  const state = { user: { type: 'string', default: '' } };

  it('is nothing, until it is told', () => {
    const { root } = appDocumentSchema.parse({
      root: { type: 'chart', id: 'c', query: 'FROM logs | STATS c = COUNT(*)' },
    });

    expect(root).toMatchObject({ type: 'chart', onClick: [] });
  });

  it('can remember a column of what was clicked, and open a flyout', () => {
    expect(
      appDocumentSchema.safeParse(
        chartDoc([remember, { type: 'openFlyout', flyout: 'more' }], state)
      ).success
    ).toBe(true);
  });

  it('can run a workflow with a column of what was clicked, or a value of the app', () => {
    expect(
      appDocumentSchema.safeParse(
        chartDoc(
          [
            {
              type: 'runWorkflow',
              workflow: 'w',
              inputs: { user: { fromColumn: 'user.name' }, again: { fromState: 'user' } },
            },
          ],
          state
        )
      ).success
    ).toBe(true);
  });

  it('is not given the value of an input, as there is none when a chart is clicked', () => {
    expect(
      issues(chartDoc([{ type: 'setState', key: 'user', value: { fromInput: true } }], state))
    ).toContain('fromInput is only valid on input nodes');
  });

  it('refuses a value that does not exist, and a flyout that is not one', () => {
    expect(issues(chartDoc([remember]))).toContain('unknown state key');
    expect(issues(chartDoc([{ type: 'openFlyout', flyout: 'nope' }], state))).toContain(
      'which is not a flyout'
    );
  });

  it('does not take more actions than any other event', () => {
    expect(
      appDocumentSchema.safeParse(
        chartDoc(
          Array.from({ length: 6 }, () => remember),
          state
        )
      ).success
    ).toBe(false);
  });
});

describe('chart nodes', () => {
  const chartDocument = (overrides: Record<string, unknown> = {}) => ({
    root: { type: 'chart', id: 'trend', query: 'ROW a = 1', ...overrides },
  });

  it('needs only a query: the chart is suggested from its columns', () => {
    expect(appDocumentSchema.parse(chartDocument()).root).toEqual({
      type: 'chart',
      id: 'trend',
      query: 'ROW a = 1',
      onClick: [],
    });
  });

  it('takes a heading and one of a few chart types', () => {
    const result = appDocumentSchema.parse(chartDocument({ title: 'Orders', chartType: 'line' }));

    expect(result.root).toMatchObject({ title: 'Orders', chartType: 'line' });
  });

  it('refuses a chart type it does not know, and a missing or empty query', () => {
    expect(appDocumentSchema.safeParse(chartDocument({ chartType: 'radar' })).success).toBe(false);
    expect(appDocumentSchema.safeParse(chartDocument({ query: '' })).success).toBe(false);
    expect(appDocumentSchema.safeParse(chartDocument({ query: undefined })).success).toBe(false);
  });

  it('runs its own query, interpolates its heading and is checked for state references', () => {
    const parsed = appDocumentSchema.parse(chartDocument({ title: 'Orders' }));
    expect(collectQueries(parsed.root)).toEqual({ trend: 'ROW a = 1' });
    expect(getInterpolatedText(parsed.root)).toEqual([{ prop: 'title', text: 'Orders' }]);

    const unknownKey = appDocumentSchema.safeParse(chartDocument({ title: '{{state.nope}}' }));
    expect(unknownKey.success).toBe(false);
  });
});
