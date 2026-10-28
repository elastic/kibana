/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Script } from 'vm';
import { fireEvent, screen, within } from '@testing-library/react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { componentsPack } from '../../pack';
import type { SectionNode } from '../section';
import type { TableNode } from '.';
import { TABLE_SORT_ENHANCEMENT } from '.';
import { TABLE_SORT_ATTRIBUTES } from './table_sort';

const { surfaces } = createIsomerRuntime({ packs: [componentsPack] });

const services: TableNode = {
  type: 'table',
  columns: [{ label: 'Service' }, { label: 'Errors' }],
  rows: [
    ['payments', 312],
    ['search', null],
    ['checkout', 1284],
    ['cart', 312],
    ['host-10', 5],
  ],
  sort: { column: 1, direction: 'desc' },
};

const queries = () => {
  const column = (index: number) =>
    within(screen.getAllByRole('rowgroup')[1])
      .getAllByRole('row')
      .map((row) => within(row).getAllByRole('cell')[index].textContent);
  const click = (label: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
  const ariaSort = () =>
    screen.getAllByRole('columnheader').map((heading) => heading.getAttribute('aria-sort'));
  const headings = () => screen.getAllByRole('columnheader').map(({ textContent }) => textContent);
  return { column, click, ariaSort, headings };
};

/**
 * Runs the enhancement script as a browser would. The SDK's `runEnhancementScript` compiles it with
 * `new Function`, which Kibana's Jest setup refuses, as Kibana's CSP would.
 */
const runScript = (js: string, root: Element) =>
  (new Script(`(function (root) {\n${js}\n})`).runInThisContext() as (root: Element) => void)(root);

/** Inserts `html` into the page, as a host inserting a render would. */
const insert = (html: string) => {
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  document.body.replaceChildren(...Array.from(body.childNodes));
};

/** Renders `node` as static HTML, as a host would insert it, and runs its enhancement script. */
const mount = (
  node: TableNode | SectionNode,
  enhancements: string[] = [TABLE_SORT_ENHANCEMENT]
) => {
  const { html, js } = surfaces.html.render(
    { type: 'view', body: [node] },
    { enhancements, scripts: 'host' }
  );
  insert(html);
  const root = document.querySelector('.isomer');
  if (root && js) {
    runScript(js, root);
  }
  return { ...queries(), html, js, root };
};

describe('tableSort', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('leaves headings as text without the enhancement', () => {
    const { js } = mount(services, []);

    expect(js).toBe('');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('marks the node’s sort without the enhancement', () => {
    const { ariaSort, headings } = mount(services, []);

    expect(ariaSort()).toEqual([null, 'descending']);
    expect(headings()).toEqual(['Service', 'Errors↓']);
  });

  it('marks the node’s sort in static HTML before the script runs, with no buttons', () => {
    const { html } = surfaces.html.render(
      { type: 'view', body: [services] },
      { enhancements: [TABLE_SORT_ENHANCEMENT], scripts: 'host' }
    );
    insert(html);
    const { ariaSort, headings } = queries();

    expect(screen.queryByRole('button')).toBeNull();
    expect(ariaSort()).toEqual([null, 'descending']);
    expect(headings()).toEqual(['Service', 'Errors↓']);
  });

  it('makes each heading a button, and marks the node’s sort', () => {
    const { ariaSort, column, headings, html } = mount(services);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(html).toContain(`button[${TABLE_SORT_ATTRIBUTES.button}]`);
    expect(ariaSort()).toEqual([null, 'descending']);
    expect(headings()).toEqual(['Service↕', 'Errors↓']);
    expect(column(0)).toEqual(['checkout', 'payments', 'cart', 'host-10', 'search']);
  });

  it('sorts numbers by value with empty cells last, and reverses on a second click', () => {
    const { click, column, ariaSort } = mount({ ...services, sort: undefined });

    click('Errors');
    expect(ariaSort()).toEqual([null, 'ascending']);
    expect(column(0)).toEqual(['host-10', 'payments', 'cart', 'checkout', 'search']);

    click('Errors');
    expect(ariaSort()).toEqual([null, 'descending']);
    expect(column(0)).toEqual(['checkout', 'payments', 'cart', 'host-10', 'search']);
  });

  it('reverses the node’s sort on the first click of its column', () => {
    const { click, column } = mount({ ...services, sort: { column: 1 } });

    click('Errors');
    expect(column(0)).toEqual(['checkout', 'payments', 'cart', 'host-10', 'search']);
  });

  it('breaks ties by source order, as the server does, whatever the node’s sort', () => {
    const node: TableNode = {
      type: 'table',
      columns: [{ label: 'Name' }, { label: 'Count' }],
      rows: [
        ['b', 1],
        ['a', 1],
      ],
    };
    const { click, column } = mount({ ...node, sort: { column: 0 } });
    click('Count');
    const clicked = column(0);
    document.body.replaceChildren();

    expect(clicked).toEqual(['b', 'a']);
    expect(mount({ ...node, sort: { column: 1 } }).column(0)).toEqual(clicked);
  });

  it('sorts text naturally, and moves aria-sort and the arrow to the clicked column', () => {
    const { click, column, ariaSort, headings } = mount({
      ...services,
      rows: [
        ['host-10', 1],
        ['host-9', 2],
        ['host-1', 3],
      ],
    });

    click('Service');
    expect(ariaSort()).toEqual(['ascending', null]);
    expect(headings()).toEqual(['Service↑', 'Errors↕']);
    expect(column(0)).toEqual(['host-1', 'host-9', 'host-10']);
  });

  it('sorts by raw value, not by the formatted text', () => {
    const { click, column } = mount({
      type: 'table',
      columns: [{ label: 'Host' }, { label: 'Disk', format: 'bytes' }],
      rows: [
        ['a', 2048],
        ['b', 5368709120],
        ['c', 900],
      ],
    });

    click('Disk');
    expect(column(0)).toEqual(['c', 'a', 'b']);
  });

  it('leaves a table whose rows were cut, or with one row, unsortable', () => {
    mount({ ...services, maxRows: 2 });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies to a table nested in a section', () => {
    const section: SectionNode = { type: 'section', title: 'Errors', body: [services] };
    mount(section);

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('enhances a table once when the script runs again', () => {
    const { js, root } = mount(services);
    if (root) {
      runScript(js, root);
    }

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('renders the same rows in the same order before the script runs', () => {
    const cells = (enhancements: string[]) =>
      surfaces.html
        .render({ type: 'view', body: [services] }, { enhancements, scripts: 'host' })
        .html.match(/<td[^>]*>[^<]*<\/td>/g)
        ?.map((cell) => cell.replace(/ data-isomer-sort-value="[^"]*"/, ''));

    expect(cells([TABLE_SORT_ENHANCEMENT])).toEqual(cells([]));
  });
});
