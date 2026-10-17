/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, appDocumentShapeSchema, customAppStateSchema } from './document_schema';
import {
  collectQueries,
  collectSources,
  getInterpolatedText,
  getNodeChildren,
  getNodeSource,
  getSourceStateKeys,
} from './node_tree';
import { MAX_NODE_COUNT, MAX_NODE_DEPTH, MAX_QUERY_LENGTH, MAX_TEMPLATE_LENGTH } from './constants';

const stackOf = (id: string, children: unknown[] = []) => ({ type: 'stack', id, children });

const nestedStack = (depth: number): unknown =>
  depth === 1 ? stackOf('n1') : stackOf(`n${depth}`, [nestedStack(depth - 1)]);

describe('appDocumentSchema', () => {
  it('parses a nested document and applies defaults', () => {
    const result = appDocumentSchema.parse({
      root: stackOf('root', [
        { type: 'heading', id: 'title', text: 'Hello' },
        { type: 'callout', id: 'note', title: 'Heads up' },
      ]),
    });

    expect(result.state).toEqual({});
    expect(result.root).toEqual({
      type: 'stack',
      id: 'root',
      direction: 'vertical',
      children: [
        { type: 'heading', id: 'title', text: 'Hello' },
        { type: 'callout', id: 'note', title: 'Heads up', color: 'primary' },
      ],
    });
  });

  it('rejects an unknown node type', () => {
    const result = appDocumentSchema.safeParse({ root: { type: 'sparkles', id: 'a' } });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown node type nested in a stack', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [{ type: 'sparkles', id: 'a' }]),
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate node ids', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        { type: 'text', id: 'same', text: 'a' },
        { type: 'text', id: 'same', text: 'b' },
      ]),
    });
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toContain(
      'Duplicate node id "same"'
    );
  });

  it('rejects ids with unsupported characters', () => {
    expect(
      appDocumentSchema.safeParse({ root: { type: 'text', id: 'has space', text: 'a' } }).success
    ).toBe(false);
  });

  it('accepts nesting at the depth limit and rejects one level beyond it', () => {
    expect(appDocumentSchema.safeParse({ root: nestedStack(MAX_NODE_DEPTH) }).success).toBe(true);
    expect(appDocumentSchema.safeParse({ root: nestedStack(MAX_NODE_DEPTH + 1) }).success).toBe(
      false
    );
  });

  it('rejects a document over the node limit', () => {
    const children = Array.from({ length: MAX_NODE_COUNT }, (_, index) => ({
      type: 'text',
      id: `t${index}`,
      text: 'a',
    }));
    // Stacks cap their own children, so spread them over several stacks.
    const chunks = Array.from({ length: Math.ceil(children.length / 40) }, (_, index) =>
      stackOf(`s${index}`, children.slice(index * 40, index * 40 + 40))
    );

    const result = appDocumentSchema.safeParse({ root: stackOf('root', chunks) });
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toEqual([
      `A document may hold at most ${MAX_NODE_COUNT} nodes`,
    ]);
  });
});

describe('a cases source', () => {
  const casesDocument = (
    source: unknown,
    extra: Record<string, unknown> = {},
    state: object = {}
  ) => ({
    state,
    root: { type: 'table', id: 'cases', source, ...extra },
  });
  const cases = (more: Record<string, unknown> = {}) => ({ type: 'cases', ...more });
  const issuesOf = (document: unknown) =>
    JSON.stringify(appDocumentSchema.safeParse(document).error?.issues ?? []);

  it('is what a table shows instead of a query, with nothing to set', () => {
    const result = appDocumentSchema.parse(casesDocument(cases()));

    expect(result.root).toEqual({
      type: 'table',
      id: 'cases',
      source: { type: 'cases' },
      onRowClick: [],
    });
  });

  it('is also what a stat and a key-value list can show', () => {
    expect(
      appDocumentSchema.safeParse({
        root: {
          type: 'stat',
          id: 's',
          title: 'Open',
          source: cases({ status: 'open', count: true }),
        },
      }).success
    ).toBe(true);
    expect(
      appDocumentSchema.safeParse({ root: { type: 'key_value', id: 'k', source: cases() } }).success
    ).toBe(true);
  });

  it('takes filters, a sort, a limit, the time range, and a count', () => {
    const source = cases({
      status: 'in-progress',
      severity: 'high',
      search: 'login',
      tag: 'custom-app',
      sort: { field: 'updated_at', order: 'desc' },
      limit: 20,
      followTimeRange: true,
      count: false,
    });

    expect(appDocumentSchema.safeParse(casesDocument(source)).success).toBe(true);
  });

  it('takes a filter from a value of the app, which is how an input drives it', () => {
    const result = appDocumentSchema.safeParse(
      casesDocument(
        cases({ status: { fromState: 'status' } }),
        {},
        {
          status: { type: 'string', default: '' },
        }
      )
    );

    expect(result.success).toBe(true);
  });

  it('needs a query or a source, and not both, and not neither', () => {
    expect(issuesOf(casesDocument(undefined))).toContain('needs a query or a source');
    expect(issuesOf(casesDocument(cases(), { query: 'FROM cases' }))).toContain(
      'needs a query or a source'
    );
    expect(
      appDocumentSchema.safeParse({ root: { type: 'table', id: 't', query: 'FROM logs' } }).success
    ).toBe(true);
  });

  it('is for stat, table and key-value only: a chart needs a query', () => {
    expect(
      appDocumentSchema.safeParse({ root: { type: 'chart', id: 'c', source: cases() } }).success
    ).toBe(false);
  });

  it('refuses a kind of source it does not know', () => {
    expect(appDocumentSchema.safeParse(casesDocument({ type: 'alerts' })).success).toBe(false);
  });

  it('refuses a status or a severity that cases do not have, saying which there are', () => {
    expect(issuesOf(casesDocument(cases({ status: 'done' })))).toContain(
      'open, in-progress, closed'
    );
    expect(issuesOf(casesDocument(cases({ severity: 'huge' })))).toContain(
      'low, medium, high, critical'
    );
  });

  it('takes an empty status or severity as no filter, as the "All" of a select does', () => {
    expect(
      appDocumentSchema.safeParse(casesDocument(cases({ status: '', severity: '' }))).success
    ).toBe(true);
  });

  it('refuses a filter from a value of the app that does not exist, naming it', () => {
    expect(issuesOf(casesDocument(cases({ tag: { fromState: 'nope' } })))).toContain(
      'unknown state key \\"nope\\"'
    );
  });

  it('keeps its limit within what the cases API gives, and a sort to what it can sort by', () => {
    expect(appDocumentSchema.safeParse(casesDocument(cases({ limit: 0 }))).success).toBe(false);
    expect(appDocumentSchema.safeParse(casesDocument(cases({ limit: 101 }))).success).toBe(false);
    expect(appDocumentSchema.safeParse(casesDocument(cases({ limit: 100 }))).success).toBe(true);
    expect(
      appDocumentSchema.safeParse(casesDocument(cases({ sort: { field: 'owner', order: 'asc' } })))
        .success
    ).toBe(false);
  });

  it('is found by the tree helpers as a source, and is not a query', () => {
    const parsed = appDocumentSchema.parse(
      casesDocument(
        cases({ status: { fromState: 'status' } }),
        {},
        {
          status: { type: 'string', default: '' },
        }
      )
    );

    expect(collectSources(parsed.root)).toEqual({
      cases: { type: 'cases', status: { fromState: 'status' } },
    });
    expect(collectQueries(parsed.root)).toEqual({});
    expect(getSourceStateKeys(collectSources(parsed.root).cases)).toEqual(['status']);
  });

  it('gives a query as an ES|QL source, so every component that shows data has a source', () => {
    const parsed = appDocumentSchema.parse({
      root: { type: 'table', id: 't', query: 'FROM logs' },
    });

    expect(getNodeSource(parsed.root)).toEqual({ type: 'esql', query: 'FROM logs' });
    expect(getSourceStateKeys({ type: 'esql', query: 'FROM logs' })).toEqual([]);
  });
});

describe('the time range', () => {
  it('has nothing to set: where it is placed is all there is to it', () => {
    const result = appDocumentSchema.parse({ root: { type: 'time_range', id: 'when' } });

    expect(result.root).toEqual({ type: 'time_range', id: 'when' });
  });

  it('can sit among the filters, or anywhere else in the layout', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        {
          type: 'stack',
          id: 'filters',
          direction: 'horizontal',
          children: [{ type: 'time_range', id: 'when' }],
        },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
      ]),
    });

    expect(result.success).toBe(true);
  });

  it('is only one for the whole app, since it sets the period of all of it', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        { type: 'time_range', id: 'when' },
        { type: 'time_range', id: 'again' },
      ]),
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('is a second time range');
    expect(JSON.stringify(result.error?.issues)).toContain('again');
  });

  it('is only one when the second is inside a flyout, too', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        { type: 'time_range', id: 'when' },
        {
          type: 'flyout',
          id: 'detail',
          title: 'D',
          children: [{ type: 'time_range', id: 'in-flyout' }],
        },
      ]),
    });

    expect(result.success).toBe(false);
  });

  it('is not a query, so it has nothing to run, and an app can do without it', () => {
    const parsed = appDocumentSchema.parse({ root: { type: 'time_range', id: 'when' } });

    expect(collectQueries(parsed.root)).toEqual({});
    expect(
      appDocumentSchema.safeParse({ root: { type: 'text', id: 't', text: 'x' } }).success
    ).toBe(true);
  });
});

describe('buttons and the workflows they run', () => {
  const buttonDocument = (actions: unknown[], state: Record<string, unknown> = {}) => ({
    state,
    root: { type: 'button', id: 'go', label: 'Isolate host', onClick: actions },
  });
  const run = (inputs: Record<string, unknown> = {}) => ({
    type: 'runWorkflow',
    workflow: 'isolate-host',
    inputs,
  });
  const issuesOf = (document: unknown) =>
    JSON.stringify(appDocumentSchema.safeParse(document).error?.issues ?? []);

  it('is a label and what happens when it is pressed, which is nothing until it is told', () => {
    const result = appDocumentSchema.parse({
      root: { type: 'button', id: 'go', label: 'Go' },
    });

    expect(result.root).toEqual({ type: 'button', id: 'go', label: 'Go', onClick: [] });
  });

  it('needs something written on it', () => {
    expect(
      appDocumentSchema.safeParse({ root: { type: 'button', id: 'go', label: '' } }).success
    ).toBe(false);
    expect(appDocumentSchema.safeParse({ root: { type: 'button', id: 'go' } }).success).toBe(false);
  });

  it('runs a workflow by its id, handing it fixed values and values of the app', () => {
    const result = appDocumentSchema.safeParse(
      buttonDocument(
        [run({ reason: 'Suspicious', severity: 3, force: true, host: { fromState: 'host' } })],
        {
          host: { type: 'string', default: 'web-1' },
        }
      )
    );

    expect(result.success).toBe(true);
  });

  it('hands nothing when it is given nothing', () => {
    const parsed = appDocumentSchema.parse(
      buttonDocument([{ type: 'runWorkflow', workflow: 'isolate-host' }])
    );

    expect((parsed.root as { onClick: Array<{ inputs: object }> }).onClick[0].inputs).toEqual({});
  });

  it('can be run by a row click, with a column of the row that was clicked', () => {
    const result = appDocumentSchema.safeParse({
      root: {
        type: 'table',
        id: 'hosts',
        query: 'FROM hosts',
        onRowClick: [run({ host: { fromColumn: 'host.name' } })],
      },
    });

    expect(result.success).toBe(true);
  });

  it('is refused with a column when a button runs it, as no row was clicked', () => {
    const text = issuesOf(buttonDocument([run({ host: { fromColumn: 'host.name' } })]));

    expect(text).toContain('takes a column, which only a row click has');
  });

  it('is refused with a value of the app that does not exist, naming it', () => {
    const text = issuesOf(buttonDocument([run({ host: { fromState: 'nope' } })]));

    expect(text).toContain('unknown state key \\"nope\\"');
  });

  it('is refused when an input would start it, which is every key that is typed', () => {
    const text = issuesOf({
      state: { q: { type: 'string', default: '' } },
      root: { type: 'search', id: 'find', label: 'Find', bind: 'q', onChange: [run()] },
    });

    expect(text).toContain('a workflow can only be run by a button or a row click');
  });

  it('names where the workflow of an action can be found, within a limit', () => {
    expect(
      appDocumentSchema.safeParse(buttonDocument([{ type: 'runWorkflow', workflow: '' }])).success
    ).toBe(false);
    expect(
      appDocumentSchema.safeParse(
        buttonDocument([{ type: 'runWorkflow', workflow: 'x'.repeat(257) }])
      ).success
    ).toBe(false);
  });

  it('hands over at most a few inputs, and each is named', () => {
    const tooMany = Object.fromEntries(Array.from({ length: 21 }, (_u, i) => [`input${i}`, 'x']));

    expect(appDocumentSchema.safeParse(buttonDocument([run(tooMany)])).success).toBe(false);
    expect(appDocumentSchema.safeParse(buttonDocument([run({ '': 'x' })])).success).toBe(false);
  });

  it('refuses something that is not a value: an object of another kind is not an input', () => {
    expect(
      appDocumentSchema.safeParse(buttonDocument([run({ host: { fromEverything: true } })])).success
    ).toBe(false);
  });

  it('is not a query, so it has nothing to run when the app loads', () => {
    const parsed = appDocumentSchema.parse(buttonDocument([run()]));

    expect(collectQueries(parsed.root)).toEqual({});
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

describe('custom content nodes', () => {
  const contentDocument = (overrides: Record<string, unknown> = {}) => ({
    root: { type: 'custom_content', id: 'board', template: '<p>{{ rows.size }}</p>', ...overrides },
  });

  it('is HTML with Liquid, with or without a query', () => {
    expect(appDocumentSchema.safeParse(contentDocument()).success).toBe(true);

    const withQuery = appDocumentSchema.parse(contentDocument({ query: 'ROW a = 1', height: 400 }));
    expect(withQuery.root).toMatchObject({ query: 'ROW a = 1', height: 400 });
    expect(collectQueries(withQuery.root)).toEqual({ board: 'ROW a = 1' });
  });

  it('has no query to run when it has none', () => {
    expect(collectQueries(appDocumentSchema.parse(contentDocument()).root)).toEqual({});
  });

  it('is not saved without a template, but can ask for one in its shape', () => {
    const withoutTemplate = contentDocument({ template: undefined, prompt: 'A status board' });

    expect(appDocumentShapeSchema.safeParse(withoutTemplate).success).toBe(true);
    const result = appDocumentSchema.safeParse(withoutTemplate);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('describe what it should show');
  });

  it('refuses a script, which would never run in the frame it is shown in', () => {
    const result = appDocumentSchema.safeParse(
      contentDocument({ template: '<script>alert(1)</script>' })
    );

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('script');
  });

  it('keeps its height within what the frame allows, and its template within the limit', () => {
    expect(appDocumentSchema.safeParse(contentDocument({ height: 100 })).success).toBe(false);
    expect(appDocumentSchema.safeParse(contentDocument({ height: 5000 })).success).toBe(false);
    expect(appDocumentSchema.safeParse(contentDocument({ height: 12.5 })).success).toBe(false);
    expect(
      appDocumentSchema.safeParse(contentDocument({ template: 'x'.repeat(MAX_TEMPLATE_LENGTH) }))
        .success
    ).toBe(true);
    expect(
      appDocumentSchema.safeParse(
        contentDocument({ template: 'x'.repeat(MAX_TEMPLATE_LENGTH + 1) })
      ).success
    ).toBe(false);
  });
});

describe('queries and stat nodes', () => {
  const statDocument = (overrides: Record<string, unknown> = {}) => ({
    root: {
      type: 'stat',
      id: 'active',
      title: 'Active users',
      query: 'ROW active = 1284',
      ...overrides,
    },
  });

  it('parses a stat with its own query', () => {
    const result = appDocumentSchema.parse(statDocument());
    expect(result.root).toEqual({
      type: 'stat',
      id: 'active',
      title: 'Active users',
      query: 'ROW active = 1284',
    });
  });

  it('rejects a stat with no query, an empty one, or one over the length limit', () => {
    const withQuery = (query: unknown) =>
      appDocumentSchema.safeParse(statDocument({ query })).success;

    expect(withQuery(undefined)).toBe(false);
    expect(withQuery('')).toBe(false);
    expect(withQuery('x'.repeat(MAX_QUERY_LENGTH))).toBe(true);
    expect(withQuery('x'.repeat(MAX_QUERY_LENGTH + 1))).toBe(false);
  });

  it('gives every data component its own query, in a stack too', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        { type: 'stat', id: 's', title: 't', query: 'ROW a = 1' },
        { type: 'table', id: 'table', query: 'ROW b = 2' },
        { type: 'key_value', id: 'facts', query: 'ROW c = 3' },
      ]),
    });
    expect(result.success).toBe(true);
  });

  it('reports structural issues first, then reference issues in document order', () => {
    expect(
      issuesOf({
        root: stackOf('root', [
          { type: 'text', id: 'dup', text: 'a' },
          { type: 'search', id: 'find', label: 'Find', bind: 'nope' },
          { type: 'text', id: 'dup', text: 'b' },
        ]),
      })
    ).toEqual(['Duplicate node id "dup"', 'Node "find" binds unknown state key "nope"']);
  });
});

const issuesOf = (input: unknown): string[] => {
  const result = appDocumentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};

describe('state declarations', () => {
  const withState = (state: unknown) => ({
    state,
    root: { type: 'text', id: 'a', text: 'hi' },
  });

  it('parses typed state with defaults', () => {
    const result = appDocumentSchema.parse(
      withState({
        service: { type: 'string', default: 'checkout' },
        limit: { type: 'number', default: 10 },
        compact: { type: 'boolean', default: false },
      })
    );
    expect(result.state.limit).toEqual({ type: 'number', default: 10 });
  });

  it('requires a default that matches the declared type', () => {
    expect(issuesOf(withState({ a: { type: 'number', default: 'ten' } }))).not.toEqual([]);
    expect(issuesOf(withState({ a: { type: 'string' } }))).not.toEqual([]);
    expect(issuesOf(withState({ a: { type: 'number', default: Infinity } }))).not.toEqual([]);
  });

  it.each(['1abc', 'has space', 'a-b', 'a.b', '', 'x'.repeat(65)])(
    'rejects %p as a state key, since it cannot be an ES|QL parameter name',
    (key) => {
      expect(issuesOf(withState({ [key]: { type: 'string', default: '' } }))).not.toEqual([]);
    }
  );

  it.each(['_tstart', '_tend', '_TSTART'])('rejects the reserved key %s', (key) => {
    expect(issuesOf(withState({ [key]: { type: 'string', default: '' } }))).not.toEqual([]);
  });

  it('rejects an over-long default string and too many keys', () => {
    expect(issuesOf(withState({ a: { type: 'string', default: 'x'.repeat(1001) } }))).not.toEqual(
      []
    );

    const tooMany = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`k${index}`, { type: 'string', default: '' }])
    );
    expect(issuesOf(withState(tooMany))).toContain('A document may hold at most 20 state keys');
  });
});

describe('interpolation references', () => {
  const doc = (text: string) => ({
    state: { service: { type: 'string', default: 'checkout' } },
    root: { type: 'heading', id: 'title', text },
  });

  it('accepts references to declared keys', () => {
    expect(issuesOf(doc('Service {{state.service}}'))).toEqual([]);
  });

  it('rejects a reference to an undeclared key', () => {
    expect(issuesOf(doc('Service {{state.sevrice}}'))).toEqual([
      'Node "title" refers to unknown state key "sevrice"',
    ]);
  });

  it('rejects anything that looks like a reference but is not one', () => {
    expect(issuesOf(doc('{{state.service.name}}'))).toEqual([
      'Node "title" has a malformed reference in "text"; use {{state.<key>}}',
    ]);
  });

  it('checks every interpolated prop, such as a callout body and a flyout title', () => {
    expect(
      issuesOf({
        root: {
          type: 'stack',
          id: 'root',
          children: [
            { type: 'callout', id: 'c', title: 'ok', text: '{{state.nope}}' },
            { type: 'flyout', id: 'f', title: '{{state.nada}}', children: [] },
          ],
        },
      })
    ).toEqual([
      'Node "c" refers to unknown state key "nope"',
      'Node "f" refers to unknown state key "nada"',
    ]);
  });
});

describe('table, flyout and key_value nodes', () => {
  const tableDoc = (onRowClick: unknown[], extra: Record<string, unknown> = {}) => ({
    state: {
      service: { type: 'string', default: '' },
      limit: { type: 'number', default: 1 },
    },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'table', id: 'orders-table', query: 'FROM orders | LIMIT 10', onRowClick },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
      ],
    },
    ...extra,
  });

  it('parses a table with typed columns and a row click that fills state and opens a flyout', () => {
    const result = appDocumentSchema.parse(
      tableDoc([
        { type: 'setState', key: 'service', value: { fromColumn: 'service.name' } },
        { type: 'openFlyout', flyout: 'detail' },
      ])
    );
    const [table] = getNodeChildren(result.root);
    expect(table).toMatchObject({ type: 'table', query: 'FROM orders | LIMIT 10' });
  });

  it('defaults a table to no actions', () => {
    const result = appDocumentSchema.parse(tableDoc([]));
    const [table, flyout] = getNodeChildren(result.root);
    expect(table).toMatchObject({ onRowClick: [] });
    expect(flyout).toMatchObject({ children: [] });
  });

  it('finds a flyout nested inside another container', () => {
    const doc = tableDoc([{ type: 'openFlyout', flyout: 'inner' }]);
    (doc.root.children as unknown[]).push({
      type: 'stack',
      id: 'wrap',
      children: [{ type: 'flyout', id: 'inner', title: 'Inner', children: [] }],
    });
    expect(issuesOf(doc)).toEqual([]);
  });

  it('rejects opening a node that does not exist or is not a flyout', () => {
    expect(issuesOf(tableDoc([{ type: 'openFlyout', flyout: 'nope' }]))).toEqual([
      'Node "orders-table" opens "nope", which is not a flyout',
    ]);
    expect(issuesOf(tableDoc([{ type: 'openFlyout', flyout: 'orders-table' }]))).toEqual([
      'Node "orders-table" opens "orders-table", which is not a flyout',
    ]);
  });

  it('rejects setting an undeclared state key', () => {
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'ghost', value: 'x' }]))).toEqual([
      'Node "orders-table" sets unknown state key "ghost"',
    ]);
  });

  it('rejects a literal that does not match the key type', () => {
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'limit', value: 'ten' }]))).toEqual([
      'Node "orders-table" sets state key "limit" (number) to a string',
    ]);
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'limit', value: 5 }]))).toEqual([]);
  });

  it('rejects fromInput on a table, where there is no input', () => {
    expect(
      issuesOf(tableDoc([{ type: 'setState', key: 'service', value: { fromInput: true } }]))
    ).toEqual(['Node "orders-table": fromInput is only valid on input nodes']);
  });

  it('rejects more than five actions on one event, and unknown action types', () => {
    const close = { type: 'closeFlyout' };
    expect(issuesOf(tableDoc(Array.from({ length: 6 }, () => close)))).not.toEqual([]);
    expect(issuesOf(tableDoc([{ type: 'runScript', code: 'alert(1)' }]))).not.toEqual([]);
  });

  it('rejects more table columns than the limit', () => {
    const columns = Array.from({ length: 51 }, (_, index) => ({ field: `c${index}` }));
    const table = (list: unknown[]) => ({
      root: { type: 'table', id: 't', query: 'ROW 1', columns: list },
    });

    expect(issuesOf(table(columns.slice(0, 50)))).toEqual([]);
    expect(issuesOf(table(columns))).not.toEqual([]);
  });

  it('validates flyout content like any other node', () => {
    expect(
      issuesOf({
        root: {
          type: 'flyout',
          id: 'f',
          title: 'Detail',
          children: [{ type: 'search', id: 'find', label: 'Find', bind: 'ghost' }],
        },
      })
    ).toEqual(['Node "find" binds unknown state key "ghost"']);
  });
});

describe('input nodes', () => {
  const inputDoc = (input: Record<string, unknown>, state: Record<string, unknown> = {}) => ({
    state: {
      severity: { type: 'string', default: 'all' },
      limit: { type: 'number', default: 1 },
      ...state,
    },
    root: { id: 'input', label: 'Severity', bind: 'severity', ...input },
  });

  const select = (extra: Record<string, unknown> = {}) =>
    inputDoc({
      type: 'select',
      options: [{ value: 'all', label: 'All' }, { value: 'high' }],
      ...extra,
    });

  it('parses a select, a button group and a search bound to a string key', () => {
    const select_ = appDocumentSchema.parse(select());
    expect(select_.root).toMatchObject({ type: 'select', bind: 'severity', onChange: [] });

    expect(
      issuesOf(inputDoc({ type: 'button_group', options: [{ value: 'a' }, { value: 'b' }] }))
    ).toEqual([]);
    expect(issuesOf(inputDoc({ type: 'search', placeholder: 'Find a service' }))).toEqual([]);
  });

  it.each(['select', 'button_group', 'search'])(
    'rejects a %s bound to an undeclared key',
    (type) => {
      expect(issuesOf(inputDoc({ type, bind: 'ghost', options: [{ value: 'a' }] }))).toEqual([
        'Node "input" binds unknown state key "ghost"',
      ]);
    }
  );

  it.each(['select', 'button_group', 'search'])(
    'rejects a %s bound to a non-string key',
    (type) => {
      expect(issuesOf(inputDoc({ type, bind: 'limit', options: [{ value: 'a' }] }))).toEqual([
        'Node "input" binds state key "limit" (number); an input needs a string key',
      ]);
    }
  );

  it('requires at least one option and enforces the option limits', () => {
    expect(issuesOf(select({ options: [] }))).not.toEqual([]);

    const options = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ value: `v${i}` }));
    expect(issuesOf(select({ options: options(50) }))).toEqual([]);
    expect(issuesOf(select({ options: options(51) }))).not.toEqual([]);
    expect(issuesOf(inputDoc({ type: 'button_group', options: options(10) }))).toEqual([]);
    expect(issuesOf(inputDoc({ type: 'button_group', options: options(11) }))).not.toEqual([]);
  });

  it('rejects an option listed twice', () => {
    expect(issuesOf(select({ options: [{ value: 'a' }, { value: 'b' }, { value: 'a' }] }))).toEqual(
      ['Node "input" has the option "a" more than once']
    );
  });

  describe('onChange', () => {
    it('accepts fromInput there, and other actions after the bound write', () => {
      expect(
        issuesOf(
          select({
            onChange: [
              { type: 'setState', key: 'severity', value: { fromInput: true } },
              { type: 'closeFlyout' },
            ],
          })
        )
      ).toEqual([]);
    });

    it('rejects fromColumn, which only a table row can supply', () => {
      expect(
        issuesOf(
          select({ onChange: [{ type: 'setState', key: 'severity', value: { fromColumn: 'a' } }] })
        )
      ).toEqual(['Node "input": fromColumn is not valid in onChange']);
    });

    it('rejects an undeclared key and a literal of the wrong type', () => {
      expect(
        issuesOf(select({ onChange: [{ type: 'setState', key: 'ghost', value: 'x' }] }))
      ).toEqual(['Node "input" sets unknown state key "ghost"']);
      expect(
        issuesOf(select({ onChange: [{ type: 'setState', key: 'limit', value: 'x' }] }))
      ).toEqual(['Node "input" sets state key "limit" (number) to a string']);
    });
  });
});

describe('customAppStateSchema', () => {
  const document = { root: { type: 'text', id: 'a', text: 'hi' } };

  it('requires the current version', () => {
    expect(customAppStateSchema.safeParse({ version: 1, document }).success).toBe(true);
    expect(customAppStateSchema.safeParse({ document }).success).toBe(false);
    expect(customAppStateSchema.safeParse({ version: 2, document }).success).toBe(false);
  });
});

describe('getNodeChildren', () => {
  it('returns children for a stack and none for leaf nodes', () => {
    const { root } = appDocumentSchema.parse({
      root: stackOf('root', [{ type: 'text', id: 'a', text: 'hi' }]),
    });
    expect(getNodeChildren(root)).toHaveLength(1);
    expect(getNodeChildren(getNodeChildren(root)[0])).toEqual([]);
  });
});
