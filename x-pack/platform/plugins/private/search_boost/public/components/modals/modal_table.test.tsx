/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ModalTableColumn, ModalTableProps } from './modal_table';
import { ModalTable } from './modal_table';

interface Item {
  name: string;
  rule: string;
}

const ITEMS: Item[] = Array.from({ length: 30 }, (_, index) => ({
  name: `index-${index + 1}`,
  rule: `rule-${index + 1}`,
}));

const COLUMNS: ReadonlyArray<ModalTableColumn<Item>> = [
  { id: 'name', name: 'Index', render: ({ name }) => name },
  { id: 'rule', name: 'Rule', render: ({ rule }) => rule },
];

const renderTable = (props: Partial<ModalTableProps<Item>> = {}) =>
  render(
    <ModalTable
      aria-label="Affected indices"
      columns={COLUMNS}
      items={ITEMS}
      getRowId={({ name }) => name}
      data-test-subj="testTable"
      {...props}
    />
  );

describe('ModalTable', () => {
  describe.each([
    ['on its own', false],
    ['nested in a list', true],
  ])('%s', (_, isNested) => {
    it('scrolls the rows under sticky headers, in the same area so their columns line up', () => {
      renderTable({ isNested });

      const table = screen.getByRole('table', { name: 'Affected indices' });
      const [headerRow, ...rows] = within(table).getAllByRole('row');
      expect(
        within(headerRow)
          .getAllByRole('columnheader')
          .map((header) => header.textContent)
      ).toEqual(['Index', 'Rule']);
      expect(rows).toHaveLength(ITEMS.length);
      expect(table).toHaveStyleRule('overflow-y', 'auto');
      expect(headerRow.parentElement).toBe(table);
      expect(headerRow).toHaveStyleRule('position', 'sticky');
      rows.forEach((row) => expect(row.parentElement).toBe(table));
    });

    it('can be focused with the keyboard, showing the focus ring around the sticky headers', async () => {
      renderTable({ isNested });

      await userEvent.tab();

      const table = screen.getByRole('table', { name: 'Affected indices' });
      expect(table).toHaveFocus();
      expect(screen.getByTestId('testTable')).toHaveStyleRule(
        'outline',
        expect.stringContaining('solid'),
        { target: ":has(> [role='table']:focus-visible)" }
      );
    });
  });
});
