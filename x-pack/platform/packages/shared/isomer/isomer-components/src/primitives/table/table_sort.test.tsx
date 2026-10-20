/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { componentsPack } from '../../pack';
import type { SectionNode } from '../section';
import type { TableNode } from '.';
import { TABLE_SORT_ENHANCEMENT } from '.';

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

const mount = (node: TableNode, enhancements: string[] = [TABLE_SORT_ENHANCEMENT]) => {
  render(surfaces.react.renderNode(node, { enhancements }) as ReactElement);
  const column = (index: number) =>
    within(screen.getAllByRole('rowgroup')[1])
      .getAllByRole('row')
      .map((row) => within(row).getAllByRole('cell')[index].textContent);
  const click = (label: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
  const ariaSort = () =>
    screen.getAllByRole('columnheader').map((heading) => heading.getAttribute('aria-sort'));
  return { column, click, ariaSort };
};

describe('tableSort', () => {
  it('leaves headings as text without the enhancement', () => {
    mount(services, []);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('makes each heading a button, and marks the node’s sort', () => {
    const { ariaSort, column } = mount(services);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(ariaSort()).toEqual([null, 'descending']);
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

  it('sorts text naturally, and moves aria-sort to the clicked column', () => {
    const { click, column, ariaSort } = mount({
      ...services,
      rows: [
        ['host-10', 1],
        ['host-9', 2],
        ['host-1', 3],
      ],
    });

    click('Service');
    expect(ariaSort()).toEqual(['ascending', null]);
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
    render(
      surfaces.react.renderNode(section, { enhancements: [TABLE_SORT_ENHANCEMENT] }) as ReactElement
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('declares no script, which Kibana could not run', () => {
    const { js } = surfaces.html.render(
      { type: 'view', body: [services] },
      { enhancements: [TABLE_SORT_ENHANCEMENT], scripts: 'host' }
    );

    expect(js).toBe('');
  });

  it('renders the same rows in the same order before any click', () => {
    const plain = renderToStaticMarkup(surfaces.react.renderNode(services) as ReactElement);
    const sortable = renderToStaticMarkup(
      surfaces.react.renderNode(services, {
        enhancements: [TABLE_SORT_ENHANCEMENT],
      }) as ReactElement
    );
    const cells = (markup: string) => markup.match(/<td[^>]*>[^<]*<\/td>/g);

    expect(cells(sortable)).toEqual(cells(plain));
  });
});
