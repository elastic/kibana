/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  appDocumentSchema,
  findNode,
  getDocumentIssues,
  type AppDocument,
  type AppNode,
  type DocumentIssue,
} from '@kbn/custom-app-common';
import { PropertiesPanel } from './properties_panel';

jest.mock('@kbn/esql/public', () => jest.requireActual('./fields/esql_editor.mock'));
// The template editor is a Monaco editor, which cannot run under Jest.
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    'aria-label': label,
  }: {
    value: string;
    onChange: (value: string) => void;
    'aria-label': string;
  }) => <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}));

const initial = (): AppDocument =>
  appDocumentSchema.parse({
    state: {
      service: { type: 'string', default: 'checkout' },
      filter: { type: 'string', default: 'x' },
    },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'heading', id: 'title', text: 'Hello' },
        { type: 'text', id: 'intro', text: 'Intro' },
        { type: 'callout', id: 'note', title: 'Note', text: 'Body', color: 'primary' },
        { type: 'stat', id: 'stat', title: 'Users', query: 'ROW users = 1' },
        {
          type: 'chart',
          id: 'trend',
          query: 'FROM logs | STATS c = COUNT(*) BY d = DATE_TRUNC(1 hour, @timestamp)',
        },
        { type: 'custom_content', id: 'board', query: 'FROM status', template: '<b>hi</b>' },
        { type: 'custom_content', id: 'note-board', template: '<p>static</p>', height: 400 },
        { type: 'table', id: 'table', query: 'FROM rows', caption: 'Rows' },
        { type: 'key_value', id: 'facts', query: 'FROM detail', fields: ['a', 'b'] },
        {
          type: 'select',
          id: 'pick',
          label: 'Pick',
          bind: 'service',
          options: [
            { value: 'checkout', label: 'Checkout' },
            { value: 'cart', label: 'Cart' },
          ],
        },
        {
          type: 'button_group',
          id: 'group',
          label: 'Group',
          bind: 'filter',
          options: [{ value: 'x' }],
        },
        { type: 'search', id: 'find', label: 'Find', bind: 'filter', placeholder: 'Look' },
        { type: 'button', id: 'isolate', label: 'Isolate host', onClick: [] },
        { type: 'time_range', id: 'period' },
        { type: 'stack', id: 'row', direction: 'horizontal', children: [] },
        { type: 'flyout', id: 'detail-flyout', title: 'Details', children: [] },
      ],
    },
  });

/** Holds the document the way the editor does, so edits that reach beyond the component apply. */
const setup = (id: string, issues?: readonly DocumentIssue[]) => {
  const onChange = jest.fn();
  const latest: { document: AppDocument } = { document: initial() };

  const Host = () => {
    const [document, setDocument] = useState(initial());
    latest.document = document;
    return (
      <PropertiesPanel
        node={findNode(document.root, id)!.node as AppNode}
        document={document}
        issues={issues ?? getDocumentIssues(document)}
        onChange={onChange}
        onEdit={(change) => setDocument((current) => change(current))}
      />
    );
  };
  render(<Host />);
  return { onChange, latest };
};

describe('PropertiesPanel', () => {
  it('names the kind of component and its id', () => {
    setup('title');

    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it.each([
    'title',
    'intro',
    'note',
    'stat',
    'table',
    'facts',
    'pick',
    'group',
    'find',
    'row',
    'detail-flyout',
  ])('leaves how %s looks to the app, with no size, spacing or format to choose', (id) => {
    setup(id);

    expect(screen.queryByLabelText(/^(size|spacing|gap|format|color|width|height)/i)).toBeNull();
    expect(screen.queryByText(/^(size|spacing|format)$/i)).toBeNull();
  });

  describe('content', () => {
    it('edits a heading, and offers to insert a value into its text', async () => {
      const { onChange } = setup('title');

      await userEvent.type(screen.getByLabelText('Text'), '!');
      expect(onChange).toHaveBeenLastCalledWith({ text: 'Hello!' });

      await userEvent.click(screen.getByRole('button', { name: 'Insert a value' }));
      await userEvent.click(screen.getByRole('button', { name: 'service' }));
      expect(onChange).toHaveBeenLastCalledWith({ text: 'Hello{{state.service}}' });
    });

    it('edits text', async () => {
      const { onChange } = setup('intro');

      await userEvent.type(screen.getByLabelText('Text'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ text: 'Intro!' });
    });

    it('edits a callout, removes its body rather than keeping an empty one, and picks its kind', async () => {
      const { onChange } = setup('note');

      await userEvent.type(screen.getByLabelText('Title'), '!');
      expect(onChange).toHaveBeenLastCalledWith({ title: 'Note!' });

      await userEvent.clear(screen.getByLabelText('Text'));
      expect(onChange).toHaveBeenLastCalledWith({ text: undefined });

      await userEvent.selectOptions(screen.getByLabelText('Kind'), 'danger');
      expect(onChange).toHaveBeenLastCalledWith({ color: 'danger' });
    });
  });

  describe('a time range', () => {
    it('is a component of its own, named as one', () => {
      setup('period');

      expect(screen.getByRole('heading', { name: 'Time range' })).toBeInTheDocument();
    });

    it('says what it does and where to put it, and has nothing to set', () => {
      setup('period');

      expect(
        screen.getByText(/Lets people change the period the whole app shows/)
      ).toBeInTheDocument();
      expect(screen.getByText(/An app has one/)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('a button', () => {
    it('edits what is written on it', async () => {
      const { onChange } = setup('isolate');

      await userEvent.type(screen.getByRole('textbox', { name: 'Label' }), '!');

      expect(onChange).toHaveBeenLastCalledWith({ label: 'Isolate host!' });
    });

    it('says what it does when it is pressed, which is nothing until a workflow is added', async () => {
      const { onChange } = setup('isolate');

      expect(screen.getByRole('heading', { name: 'When it is pressed' })).toBeInTheDocument();
      expect(screen.getByText('This button does nothing yet.')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('customAppAddWorkflowAction'));
      expect(onChange).toHaveBeenLastCalledWith({
        onClick: [{ type: 'runWorkflow', workflow: '', inputs: {} }],
      });
    });

    it('is a component of its own, named as one', () => {
      setup('isolate');

      expect(screen.getByRole('heading', { name: 'Button' })).toBeInTheDocument();
    });
  });

  describe('data', () => {
    it('gives each data component an ES|QL editor with its own query', () => {
      setup('table');

      expect(screen.getByLabelText('ES|QL query editor')).toHaveValue('FROM rows');
    });

    it('edits a stat: its title and its query, and has no column to choose', async () => {
      const { onChange } = setup('stat');

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), '2');
      expect(onChange).toHaveBeenLastCalledWith({ query: 'ROW users = 12' });

      // It shows the first column; a query that wants another can KEEP it.
      expect(screen.queryByLabelText('Column')).not.toBeInTheDocument();
    });

    it('edits a chart: its heading, its type and its query', async () => {
      const { onChange } = setup('trend');

      await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'T');
      expect(onChange).toHaveBeenLastCalledWith({ title: 'T' });

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chart type' }), 'line');
      expect(onChange).toHaveBeenLastCalledWith({ chartType: 'line' });

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), ' ');
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: expect.any(String) })
      );
    });

    it('lets a chart go back to the type Lens suggests', async () => {
      const { onChange } = setup('trend');

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chart type' }), 'bar');
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chart type' }), 'auto');

      expect(onChange).toHaveBeenLastCalledWith({ chartType: undefined });
    });

    it('edits the template of custom content, in a code editor', async () => {
      const { onChange } = setup('board');

      expect(screen.getByLabelText('Template editor')).toHaveValue('<b>hi</b>');
      await userEvent.type(screen.getByLabelText('Template editor'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ template: '<b>hi</b>!' });
    });

    it('lets custom content use a query or not, and has no say in how tall it is', async () => {
      const { onChange } = setup('note-board');

      expect(screen.queryByLabelText('ES|QL query editor')).not.toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: 'Height' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenLastCalledWith({ query: 'ROW value = 1' });
    });

    it('lets custom content that has a query drop it', async () => {
      const { onChange } = setup('board');

      expect(screen.getByLabelText('ES|QL query editor')).toHaveValue('FROM status');
      await userEvent.click(screen.getByRole('switch'));

      expect(onChange).toHaveBeenLastCalledWith({ query: undefined });
    });

    it('edits the query of a table', async () => {
      const { onChange } = setup('table');

      await userEvent.type(screen.getByLabelText('ES|QL query editor'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ query: 'FROM rows!' });
    });

    it('lets a table choose its columns, and says what a row click does', async () => {
      const { onChange } = setup('table');

      await userEvent.click(screen.getByRole('switch', { name: 'Choose which columns to show' }));
      expect(onChange).toHaveBeenLastCalledWith({ columns: [{ field: '' }] });

      expect(screen.getByText('When a row is clicked')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remember a column' })).toBeInTheDocument();
    });

    it('remembers a column of the clicked row as a value named after it', async () => {
      const { latest } = setup('table');

      await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));
      await userEvent.type(screen.getByLabelText('Column 1'), 'service name');
      await userEvent.tab();

      const table = findNode(latest.document.root, 'table')!.node;
      expect(table).toMatchObject({
        onRowClick: [
          { type: 'setState', key: 'service_name', value: { fromColumn: 'service name' } },
        ],
      });
      expect(latest.document.state.service_name).toEqual({ type: 'string', default: '' });
    });

    it('edits the fields of a key-value list', async () => {
      const { onChange } = setup('facts');
      expect(screen.getByLabelText('Fields to show')).toHaveValue('a, b');

      await userEvent.type(screen.getByLabelText('Fields to show'), 'x');

      expect(onChange).toHaveBeenLastCalledWith({ fields: ['a', 'bx'] });
    });
  });

  describe('inputs', () => {
    it('edits the label and the options of a select', async () => {
      const { onChange } = setup('pick');

      await userEvent.type(screen.getByLabelText('Label'), '!');
      expect(onChange).toHaveBeenLastCalledWith({ label: 'Pick!' });

      await userEvent.click(screen.getByRole('button', { name: 'Add option' }));
      expect(onChange).toHaveBeenLastCalledWith({
        options: [
          { value: 'checkout', label: 'Checkout' },
          { value: 'cart', label: 'Cart' },
          { value: 'option-3' },
        ],
      });
    });

    it('says what a select starts as, from its own options, and lets that change', async () => {
      const { latest } = setup('pick');
      const startsAs = screen.getByLabelText('Starts as');
      expect(startsAs).toHaveValue('checkout');
      expect(
        Array.from(startsAs.querySelectorAll('option')).map((option) => option.textContent)
      ).toEqual(['Checkout', 'Cart']);

      await userEvent.selectOptions(startsAs, 'cart');

      expect(latest.document.state.service).toEqual({ type: 'string', default: 'cart' });
    });

    it('says what a search box starts as, as text', async () => {
      const { latest } = setup('find');
      const startsAs = screen.getByLabelText('Starts as');
      expect(startsAs).toHaveValue('x');

      await userEvent.clear(startsAs);
      await userEvent.type(startsAs, 'checkout');

      expect(latest.document.state.filter).toEqual({ type: 'string', default: 'checkout' });
    });

    it('tells the author the name queries use for what an input sets', () => {
      setup('pick');

      expect(screen.getByText('Queries use this value as ?service')).toBeInTheDocument();
    });

    it('has nothing to pick the value it sets, or actions to run after: that is automatic', () => {
      setup('pick');

      expect(screen.queryByLabelText('Value it sets')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument();
    });

    it('edits a button group like a select', async () => {
      const { onChange } = setup('group');

      await userEvent.type(screen.getByLabelText('Label'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ label: 'Group!' });
      expect(screen.getByLabelText('Value 1')).toHaveValue('x');
    });

    it('edits a search box, and removes an emptied placeholder', async () => {
      const { onChange } = setup('find');

      await userEvent.clear(screen.getByLabelText('Placeholder'));

      expect(onChange).toHaveBeenLastCalledWith({ placeholder: undefined });
    });
  });

  describe('layout', () => {
    it('lets a stack be top to bottom or side by side, and nothing else', async () => {
      const { onChange } = setup('row');

      await userEvent.selectOptions(screen.getByLabelText('Layout'), 'vertical');

      expect(onChange).toHaveBeenLastCalledWith({ direction: 'vertical' });
    });

    it('edits only the title of a flyout', async () => {
      const { onChange } = setup('detail-flyout');

      await userEvent.type(screen.getByLabelText('Title'), '!');

      expect(onChange).toHaveBeenLastCalledWith({ title: 'Details!' });
    });
  });

  describe('problems', () => {
    it('lists only the problems of the selected component', () => {
      setup('stat', [
        { message: 'Node "stat", query: Too small', nodeId: 'stat' },
        { message: 'Node "table", caption: Too long', nodeId: 'table' },
        { message: 'Something about the whole document' },
      ]);

      expect(screen.getByText('This component needs attention')).toBeInTheDocument();
      expect(screen.getByText('Node "stat", query: Too small')).toBeInTheDocument();
      expect(screen.queryByText(/"table"/)).not.toBeInTheDocument();
      expect(screen.queryByText(/whole document/)).not.toBeInTheDocument();
    });

    it('shows nothing when the component is fine', () => {
      setup('stat', []);

      expect(screen.queryByText('This component needs attention')).not.toBeInTheDocument();
    });
  });
});
