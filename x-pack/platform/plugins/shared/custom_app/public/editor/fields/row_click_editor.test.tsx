/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema, findNode, type AppDocument } from '@kbn/custom-app-common';
import { RowClickEditor } from './row_click_editor';

const documentWith = (
  onRowClick: unknown[] = [],
  state: Record<string, unknown> = {}
): AppDocument =>
  appDocumentSchema.parse({
    state,
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'table', id: 'table', query: 'ROW 1', onRowClick },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
        { type: 'flyout', id: 'other', title: 'Other', children: [] },
      ],
    },
  });

const text = { type: 'string', default: '' };

/** Holds the document the way the editor does, and exposes the latest to the test. */
const setup = (initial: AppDocument) => {
  const latest: { document: AppDocument } = { document: initial };
  const Host = () => {
    const [document, setDocument] = useState(initial);
    latest.document = document;
    const table = findNode(document.root, 'table')!.node;
    return (
      <RowClickEditor
        nodeId="table"
        actions={table.type === 'table' ? table.onRowClick : []}
        document={document}
        flyoutIds={['detail', 'other']}
        onEdit={(change) => setDocument((current) => change(current))}
      />
    );
  };
  render(<Host />);
  return latest;
};

const actionsOf = (document: AppDocument) => {
  const table = findNode(document.root, 'table')!.node;
  return table.type === 'table' ? table.onRowClick : [];
};

const remember = async (column: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));
  const inputs = screen.getAllByLabelText(/^Column \d+$/);
  await userEvent.type(inputs[inputs.length - 1], column);
  await userEvent.tab();
};

describe('RowClickEditor', () => {
  it('explains itself, and starts with nothing remembered and no flyout', () => {
    setup(documentWith());

    expect(screen.getByText(/Remember columns of the clicked row/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Column \d+$/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Then open a flyout')).toHaveValue('');
  });

  it('shows what is remembered, with the name a query uses for it', () => {
    setup(
      documentWith([{ type: 'setState', key: 'service', value: { fromColumn: 'service.name' } }], {
        service: text,
      })
    );

    expect(screen.getByLabelText('Column 1')).toHaveValue('service.name');
    expect(screen.getByText('?service')).toBeInTheDocument();
  });

  describe('remembering a column', () => {
    it('does nothing until the column has a name', async () => {
      const latest = setup(documentWith());

      await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));
      expect(screen.getByLabelText('Column 1')).toBeInTheDocument();
      expect(actionsOf(latest.document)).toEqual([]);

      await userEvent.tab();
      expect(actionsOf(latest.document)).toEqual([]);
    });

    it('remembers it as a value named after the column, once the author has finished typing', async () => {
      const latest = setup(documentWith());

      await remember('Service Name');

      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'service_name', value: { fromColumn: 'Service Name' } },
      ]);
      expect(latest.document.state.service_name).toEqual({ type: 'string', default: '' });
    });

    it('does not act at every key', async () => {
      const latest = setup(documentWith());
      await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));

      await userEvent.type(screen.getByLabelText('Column 1'), 'ser');

      expect(actionsOf(latest.document)).toEqual([]);
      expect(latest.document.state).toEqual({});
    });

    it('shows the name a query will use, as soon as it is remembered', async () => {
      setup(documentWith());

      await remember('service');

      expect(await screen.findByText('?service')).toBeInTheDocument();
    });

    it('reuses a text value of the same name, so one column means one value everywhere', async () => {
      const latest = setup(documentWith([], { service: { type: 'string', default: 'checkout' } }));

      await remember('service');

      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
      ]);
      expect(latest.document.state.service).toEqual({ type: 'string', default: 'checkout' });
    });

    it('makes a new name rather than reuse a value of another kind', async () => {
      const latest = setup(documentWith([], { count: { type: 'number', default: 1 } }));

      await remember('count');

      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'count_2', value: { fromColumn: 'count' } },
      ]);
      expect(latest.document.state.count).toEqual({ type: 'number', default: 1 });
    });

    it('can remember several columns, in the order they were added', async () => {
      const latest = setup(documentWith());

      await remember('service');
      await remember('region');

      expect(
        actionsOf(latest.document).map((action) => action.type === 'setState' && action.key)
      ).toEqual(['service', 'region']);
    });

    it('lets an empty row be given up on', async () => {
      setup(documentWith());
      await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));

      await userEvent.click(screen.getByRole('button', { name: 'Forget column 1' }));

      expect(screen.queryByLabelText('Column 1')).not.toBeInTheDocument();
    });
  });

  describe('changing what is remembered', () => {
    const remembered = [{ type: 'setState', key: 'service', value: { fromColumn: 'service' } }];

    it('follows a column that is renamed, with the value it names', async () => {
      const latest = setup(documentWith(remembered, { service: text }));

      await userEvent.clear(screen.getByLabelText('Column 1'));
      await userEvent.type(screen.getByLabelText('Column 1'), 'region');
      await userEvent.tab();

      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'region', value: { fromColumn: 'region' } },
      ]);
      expect(latest.document.state.region).toEqual({ type: 'string', default: '' });
    });

    it('ignores a column emptied and left', async () => {
      const latest = setup(documentWith(remembered, { service: text }));

      await userEvent.clear(screen.getByLabelText('Column 1'));
      await userEvent.tab();

      expect(actionsOf(latest.document)).toEqual(remembered);
    });

    it('forgets a column', async () => {
      const latest = setup(documentWith(remembered, { service: text }));

      await userEvent.click(screen.getByRole('button', { name: 'Forget column 1' }));

      expect(actionsOf(latest.document)).toEqual([]);
    });
  });

  describe('opening a flyout', () => {
    it('opens the chosen flyout after the columns are remembered, and can be set to none', async () => {
      const latest = setup(documentWith());
      await remember('service');

      await userEvent.selectOptions(screen.getByLabelText('Then open a flyout'), 'detail');
      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
        { type: 'openFlyout', flyout: 'detail' },
      ]);

      await userEvent.selectOptions(screen.getByLabelText('Then open a flyout'), '');
      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
      ]);
    });

    it('keeps the flyout last when another column is remembered after it was chosen', async () => {
      const latest = setup(documentWith());
      await userEvent.selectOptions(screen.getByLabelText('Then open a flyout'), 'other');

      await remember('service');

      expect(actionsOf(latest.document).map((action) => action.type)).toEqual([
        'setState',
        'openFlyout',
      ]);
    });

    it('shows the flyout that is already opened', () => {
      setup(documentWith([{ type: 'openFlyout', flyout: 'other' }]));

      expect(screen.getByLabelText('Then open a flyout')).toHaveValue('other');
    });
  });

  describe('actions it does not show', () => {
    const closeAndFix = [
      { type: 'closeFlyout' },
      { type: 'setState', key: 'service', value: 'fixed' },
    ];

    it('keeps them, between what is remembered and the flyout', async () => {
      const latest = setup(
        documentWith([...closeAndFix, { type: 'openFlyout', flyout: 'detail' }], { service: text })
      );

      await remember('region');

      expect(actionsOf(latest.document)).toEqual([
        { type: 'setState', key: 'region', value: { fromColumn: 'region' } },
        ...closeAndFix,
        { type: 'openFlyout', flyout: 'detail' },
      ]);
    });

    it('does not show a fixed value as something remembered', () => {
      setup(documentWith(closeAndFix, { service: text }));

      expect(screen.queryByLabelText('Column 1')).not.toBeInTheDocument();
    });
  });
});

describe('RowClickEditor for a chart', () => {
  const chartDocument = (onClick: unknown[] = []): AppDocument =>
    appDocumentSchema.parse({
      state: { user: { type: 'string', default: '' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'chart',
            id: 'users',
            query: 'FROM logs | STATS c = COUNT(*) BY user.name',
            onClick,
          },
          { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
        ],
      },
    });

  const setupChart = (initial: AppDocument) => {
    const latest: { document: AppDocument } = { document: initial };
    const Host = () => {
      const [document, setDocument] = useState(initial);
      latest.document = document;
      const chart = findNode(document.root, 'users')!.node;
      return (
        <RowClickEditor
          nodeId="users"
          nodeType="chart"
          actions={chart.type === 'chart' ? chart.onClick : []}
          document={document}
          flyoutIds={['detail']}
          onEdit={(change) => setDocument((current) => change(current))}
        />
      );
    };
    render(<Host />);
    return latest;
  };

  const chartOf = (document: AppDocument) => findNode(document.root, 'users')!.node;

  it('remembers a column of what was clicked, as a value named after it, on the chart', async () => {
    const latest = setupChart(chartDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Remember a column' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Column 1' }), 'user.name');
    await userEvent.tab();

    expect(chartOf(latest.document)).toMatchObject({
      onClick: [{ type: 'setState', key: 'user_name', value: { fromColumn: 'user.name' } }],
    });
    expect(latest.document.state.user_name).toEqual({ type: 'string', default: '' });
    expect(chartOf(latest.document)).not.toHaveProperty('onRowClick');
  });

  it('opens a flyout after the columns are remembered', async () => {
    const latest = setupChart(
      chartDocument([{ type: 'setState', key: 'user', value: { fromColumn: 'user.name' } }])
    );

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Then open a flyout' }),
      'detail'
    );

    expect(chartOf(latest.document)).toMatchObject({
      onClick: [
        { type: 'setState', key: 'user', value: { fromColumn: 'user.name' } },
        { type: 'openFlyout', flyout: 'detail' },
      ],
    });
  });

  it('keeps what else the chart does, which an agent may have written, as it is', async () => {
    const workflow = { type: 'runWorkflow', workflow: 'w', inputs: {} };
    const latest = setupChart(
      chartDocument([
        { type: 'setState', key: 'user', value: { fromColumn: 'user.name' } },
        workflow,
      ])
    );

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Then open a flyout' }),
      'detail'
    );

    expect((chartOf(latest.document) as { onClick: unknown[] }).onClick).toContainEqual(workflow);
  });
});
