/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { TableActionsPopover } from './table_actions_popover';
import { MaintenanceWindowStatus } from '../../common';

const mockAddSuccess = jest.fn();
jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addSuccess: mockAddSuccess } },
        },
      };
    },
  };
});

describe('TableActionsPopover', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Running}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );

    expect(result.getByTestId('table-actions-icon-button')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is running', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Running}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));

    // management | lifecycle | delete — menu is portaled, so query the full document.
    const menuOrder = Array.from(
      result.baseElement.querySelectorAll(
        [
          '[data-test-subj="table-actions-edit"]',
          '[data-test-subj="table-actions-copy-id"]',
          '[data-test-subj="table-actions-cancel"]',
          '[data-test-subj="table-actions-cancel-and-archive"]',
          '[data-test-subj="table-actions-delete"]',
          '[role="separator"]',
        ].join(', ')
      )
    ).map((el) => el.getAttribute('data-test-subj') ?? '|');

    expect(menuOrder).toEqual([
      'table-actions-edit',
      'table-actions-copy-id',
      '|',
      'table-actions-cancel',
      'table-actions-cancel-and-archive',
      '|',
      'table-actions-delete',
    ]);
  });

  test('it shows the correct actions when a maintenance window is upcoming', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Upcoming}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-edit')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-archive')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-delete')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is finished', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Finished}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-edit')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-archive')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-delete')).toBeInTheDocument();
  });

  test('it shows the correct actions when a maintenance window is archived', () => {
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Archived}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );
    fireEvent.click(result.getByTestId('table-actions-icon-button'));
    expect(result.getByTestId('table-actions-unarchive')).toBeInTheDocument();
    expect(result.getByTestId('table-actions-delete')).toBeInTheDocument();
  });

  test('it shows the success toast when maintenance window id is copied', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(''),
      },
    });

    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Archived}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={() => {}}
      />
    );

    await userEvent.click(await result.findByTestId('table-actions-icon-button'));
    expect(await result.findByTestId('table-actions-copy-id')).toBeInTheDocument();

    await userEvent.click(await result.findByTestId('table-actions-copy-id'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123');
    expect(mockAddSuccess).toHaveBeenCalledWith('Copied maintenance window ID to clipboard');

    Object.assign(navigator, global.window.navigator.clipboard);
  });

  test('it calls onDelete function when maintenance window is deleted', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    const result = appMockRenderer.render(
      <TableActionsPopover
        id={'123'}
        isLoading={false}
        status={MaintenanceWindowStatus.Archived}
        onEdit={() => {}}
        onCancel={() => {}}
        onArchive={() => {}}
        onCancelAndArchive={() => {}}
        onDelete={onDelete}
      />
    );

    await user.click(await result.findByTestId('table-actions-icon-button'));
    expect(await result.findByTestId('table-actions-delete')).toBeInTheDocument();

    await user.click(await result.findByTestId('table-actions-delete'));
    const deleteModalConfirmButton = await result.findByTestId('confirmModalConfirmButton');
    expect(deleteModalConfirmButton).toBeInTheDocument();
    await user.click(deleteModalConfirmButton);
    expect(onDelete).toHaveBeenCalledWith('123');
  });
});
