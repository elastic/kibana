/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { OutlinePane } from './outline_pane';

const { root } = appDocumentSchema.parse({
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'heading', id: 'title', text: 'Service health' },
      {
        type: 'stack',
        id: 'filters',
        direction: 'horizontal',
        children: [{ type: 'text', id: 'hint', text: 'Pick a filter' }],
      },
      { type: 'flyout', id: 'detail', title: 'Details', children: [] },
    ],
  },
});

const setup = (props: Partial<React.ComponentProps<typeof OutlinePane>> = {}) => {
  const handlers = {
    onSelect: jest.fn(),
    onAdd: jest.fn(),
    onDuplicate: jest.fn(),
    onMove: jest.fn(),
    onRemove: jest.fn(),
  };
  render(
    <OutlinePane
      root={root}
      selectedId="root"
      issues={[]}
      isRootSelected={false}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('OutlinePane', () => {
  describe('tree', () => {
    it('lists every component, nested under the one that holds it', () => {
      setup();

      const tree = screen.getByRole('list', { name: 'Components' });
      const buttons = within(tree).getAllByRole('button');
      expect(buttons.map((button) => button.getAttribute('data-test-subj'))).toEqual([
        'customAppOutline-root',
        'customAppOutline-title',
        'customAppOutline-filters',
        'customAppOutline-hint',
        'customAppOutline-detail',
      ]);
      expect(screen.getByTestId('customAppOutline-hint').closest('ul')?.closest('li')).toBe(
        screen.getByTestId('customAppOutline-filters').closest('li')
      );
    });

    it('says what each one is and shows a few words to tell them apart', () => {
      setup();

      expect(
        within(screen.getByTestId('customAppOutline-title')).getByText('Heading')
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('customAppOutline-title')).getByText('Service health')
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('customAppOutline-filters')).getByText('horizontal')
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('customAppOutline-detail')).getByText('Details')
      ).toBeInTheDocument();
    });

    it('marks the selected component, and only that one', () => {
      setup({ selectedId: 'hint' });

      expect(screen.getByTestId('customAppOutline-hint')).toHaveAttribute('aria-current', 'true');
      expect(screen.getByTestId('customAppOutline-title')).not.toHaveAttribute('aria-current');
    });

    it('selects a component when it is clicked', async () => {
      const { onSelect } = setup();

      await userEvent.click(screen.getByTestId('customAppOutline-hint'));

      expect(onSelect).toHaveBeenCalledWith('hint');
    });

    it('marks the components that have problems', () => {
      setup({ issues: [{ message: 'broken', nodeId: 'hint' }, { message: 'general' }] });

      expect(
        within(screen.getByTestId('customAppOutline-hint')).getByTitle('Needs attention')
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('customAppOutline-title')).queryByTitle('Needs attention')
      ).toBeNull();
    });
  });

  describe('toolbar', () => {
    it('offers every kind of component to add, grouped, and adds the one chosen', async () => {
      const { onAdd } = setup();

      await userEvent.click(screen.getByRole('button', { name: 'Add' }));

      ['Layout', 'Content', 'Data', 'Inputs'].forEach((group) => {
        expect(screen.getByRole('heading', { name: group })).toBeInTheDocument();
      });
      [
        'Stack',
        'Flyout',
        'Heading',
        'Text',
        'Callout',
        'Stat',
        'Table',
        'Key-value list',
        'Select',
        'Button group',
        'Search',
      ].forEach((label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: 'Table' }));
      expect(onAdd).toHaveBeenCalledWith('table');
    });

    it('duplicates, moves and deletes the selection', async () => {
      const { onDuplicate, onMove, onRemove } = setup({ selectedId: 'title' });

      await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
      await userEvent.click(screen.getByRole('button', { name: 'Move up' }));
      await userEvent.click(screen.getByRole('button', { name: 'Move down' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(onDuplicate).toHaveBeenCalledTimes(1);
      expect(onMove.mock.calls).toEqual([['up'], ['down']]);
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('cannot duplicate, move or delete the root, but can still add to it', () => {
      setup({ isRootSelected: true });

      ['Duplicate', 'Move up', 'Move down', 'Delete'].forEach((name) =>
        expect(screen.getByRole('button', { name })).toBeDisabled()
      );
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    });
  });
});
