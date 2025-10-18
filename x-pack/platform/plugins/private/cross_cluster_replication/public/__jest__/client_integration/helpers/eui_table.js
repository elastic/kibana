/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';

/**
 * Get table cell values as a 2D array.
 * Useful for asserting table data in a structured way.
 *
 * @param {string} tableTestSubj - The data-test-subj of the EuiInMemoryTable
 * @returns {string[][]} Array of rows, where each row is an array of cell text values
 *
 * @example
 * const cellValues = getTableCellsValues('myTable');
 * expect(cellValues[0]).toEqual(['', 'Name', 'Status', '']);
 */
export const getTableCellsValues = (tableTestSubj) => {
  const table =
    screen.queryByTestId(tableTestSubj) ||
    document.querySelector(`[data-test-subj="${tableTestSubj}"]`);
  if (!table) {
    throw new Error(`Table with test subject "${tableTestSubj}" not found`);
  }

  const tbody = table.querySelector('tbody');
  if (!tbody) return [];

  const rows = Array.from(tbody.querySelectorAll('tr'));
  return rows.map((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    return cells.map((cell) => {
      const content =
        cell.querySelector('.euiTableCellContent__text') ||
        cell.querySelector('.euiTableCellContent') ||
        cell;
      // Preserve original text content including whitespace (don't trim)
      return content.textContent || '';
    });
  });
};

/**
 * Get table row elements for direct interaction with cells.
 * Useful when you need to click buttons, checkboxes, or other interactive elements within rows.
 *
 * @param {string} tableTestSubj - The data-test-subj of the EuiInMemoryTable
 * @returns {HTMLElement[]} Array of table row elements
 *
 * @example
 * const rows = getTableRows('myTable');
 * const firstRowCheckbox = within(rows[0]).getByRole('checkbox');
 * await user.click(firstRowCheckbox);
 */
export const getTableRows = (tableTestSubj) => {
  const table =
    screen.queryByTestId(tableTestSubj) ||
    document.querySelector(`[data-test-subj="${tableTestSubj}"]`);
  if (!table) {
    throw new Error(`Table with test subject "${tableTestSubj}" not found`);
  }

  const tbody = table.querySelector('tbody');
  if (!tbody) return [];

  return Array.from(tbody.querySelectorAll('tr'));
};
