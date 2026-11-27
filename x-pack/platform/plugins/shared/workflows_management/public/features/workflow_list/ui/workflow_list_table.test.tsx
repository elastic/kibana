/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import type { WorkflowListTableProps } from './workflow_list_table';
import { WorkflowListTable } from './workflow_list_table';
import { getWorkflowNextExecutionTime } from '../../../lib/next_execution_time';
import { TestProvider } from '../../../shared/mocks/test_providers';

jest.mock('../../../lib/next_execution_time');

const ROW_COUNT = 25;

const createItem = (index: number): WorkflowListItemDto =>
  ({
    id: `workflow-${index}`,
    name: `Workflow ${index}`,
    description: '',
    enabled: true,
    valid: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    lastUpdatedAt: new Date('2025-01-01T00:00:00Z'),
    createdBy: 'elastic',
    lastUpdatedBy: 'elastic',
    definition: {
      version: '1',
      name: `Workflow ${index}`,
      enabled: true,
      tags: ['a'],
      triggers: [{ type: 'manual' }],
      steps: [],
    },
    history: [],
  } as unknown as WorkflowListItemDto);

const items = Array.from({ length: ROW_COUNT }, (_, index) => createItem(index));

const noop = jest.fn();

const SelectableTable = (overrides: Partial<WorkflowListTableProps>) => {
  const [selectedItems, setSelectedItems] = useState<WorkflowListItemDto[]>([]);
  return (
    <WorkflowListTable
      items={items}
      page={1}
      size={ROW_COUNT}
      total={ROW_COUNT}
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
      onPageChange={noop}
      onToggleWorkflow={noop}
      onDeleteWorkflow={noop}
      onCloneWorkflow={noop}
      onExportWorkflow={noop}
      onRequestRun={noop}
      onEditWorkflow={noop}
      canCreateWorkflow
      canReadWorkflow
      canReadWorkflowExecution
      canUpdateWorkflow
      canDeleteWorkflow
      canExecuteWorkflow
      {...overrides}
    />
  );
};

describe('WorkflowListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    }));
  });

  it('selects every row when the header checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<SelectableTable />, { wrapper: TestProvider });

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /^Select row/ });
    expect(rowCheckboxes).toHaveLength(ROW_COUNT);
    rowCheckboxes.forEach((checkbox) => expect(checkbox).toBeChecked());
  });

  // EUI warns once per cell, per render, for %/vw/cqw/cqi widths. With one warning per cell per
  // selection change, a 100+ row page spends seconds in console interception (dev builds).
  it('does not trigger the EUI "not recommended unit" width warning on render or selection', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<SelectableTable />, { wrapper: TestProvider });

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));

    const unitWarnings = warnSpy.mock.calls.filter(([message]) =>
      String(message).includes('not recommended unit')
    );
    expect(unitWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });

  // `EuiBasicTable` re-runs every column `render` on a selection change. The cells must bail out,
  // otherwise per-row work (e.g. the RRule evaluation) is repeated for every row on every click.
  it('does not redo per-row cell work when only the selection changes', async () => {
    const scheduledItems = items.map((item) => ({
      ...item,
      definition: {
        ...item.definition,
        triggers: [{ type: 'scheduled', with: { every: '5m' } }],
      },
    })) as unknown as WorkflowListItemDto[];
    const user = userEvent.setup();
    render(<SelectableTable items={scheduledItems} />, { wrapper: TestProvider });
    expect(getWorkflowNextExecutionTime).toHaveBeenCalledTimes(ROW_COUNT);
    (getWorkflowNextExecutionTime as jest.Mock).mockClear();

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    await user.click(screen.getByRole('checkbox', { name: 'Deselect rows' }));

    expect(getWorkflowNextExecutionTime).not.toHaveBeenCalled();
  });
});
