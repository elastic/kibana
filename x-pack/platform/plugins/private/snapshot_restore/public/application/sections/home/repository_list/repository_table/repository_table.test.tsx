/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { Repository } from '../../../../../../common/types';
import { RepositoryTable } from './repository_table';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  reactRouterNavigate: (_history: unknown, path: string, onClick?: () => void) => ({
    href: path,
    onClick: (event: any) => {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
      onClick?.();
    },
  }),
}));

const mockToastNotifications = {
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
};

jest.mock('../../../../app_context', () => {
  const actual =
    jest.requireActual<typeof import('../../../../app_context')>('../../../../app_context');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMemoryHistory: createHistory } = require('history');
  const history = createHistory();

  return {
    ...actual,
    useToastNotifications: () => mockToastNotifications,
    useServices: () => ({
      history,
      uiMetricService: { trackUiMetric: jest.fn() },
      i18n: {
        translate: (_key: string, { defaultMessage, values }: any) => {
          if (!values) return defaultMessage;
          return Object.keys(values).reduce(
            (acc, k) => acc.replace(`{${k}}`, String(values[k])),
            defaultMessage
          );
        },
      },
    }),
  };
});

jest.mock('../../../../components', () => {
  return {
    ConfirmDefaultRepositoryModal: ({
      onCancel,
      onConfirm,
      dataTestSubj = 'confirmDefaultRepositoryModal',
    }: any) => {
      return (
        <div data-test-subj={dataTestSubj}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm}>Change default</button>
        </div>
      );
    },
    RepositoryDeleteProvider: ({ children }: any) => children(jest.fn()),
  };
});

describe('<RepositoryTable /> default repository actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderTable = (props: Partial<React.ComponentProps<typeof RepositoryTable>> = {}) => {
    const repositories: Repository[] = props.repositories ?? [
      { name: 'repo1', type: 'fs', settings: { location: '/tmp' } } as any,
    ];

    const onSetDefaultRepository = props.onSetDefaultRepository ?? jest.fn().mockResolvedValue({});

    const renderResult = render(
      <I18nProvider>
        <RepositoryTable
          repositories={repositories}
          defaultRepository={props.defaultRepository ?? null}
          managedRepository={props.managedRepository}
          canSetDefaultRepository={props.canSetDefaultRepository}
          onSetDefaultRepository={onSetDefaultRepository}
          reload={jest.fn()}
          openRepositoryDetailsUrl={(name) => `/repositories/${encodeURIComponent(name)}`}
          onRepositoryDeleted={jest.fn()}
        />
      </I18nProvider>
    );

    return { repositories, onSetDefaultRepository, ...renderResult };
  };

  it('shows a "Default" badge for the default repository', () => {
    renderTable({ defaultRepository: 'repo1' });

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('disables removal of the default repository in the row actions', async () => {
    renderTable({ defaultRepository: 'repo1' });

    fireEvent.click(screen.getByTestId('repositoryActionsMenuButton-repo1'));

    expect(await screen.findByTestId('deleteRepositoryButton-repo1')).toBeDisabled();
  });

  it('hides "Set as default" action when missing privilege', async () => {
    renderTable({
      repositories: [
        { name: 'repo1', type: 'fs', settings: { location: '/tmp' } } as any,
        { name: 'repo2', type: 'fs', settings: { location: '/tmp' } } as any,
      ],
      defaultRepository: 'repo1',
      canSetDefaultRepository: false,
    });

    fireEvent.click(screen.getByTestId('repositoryActionsMenuButton-repo2'));

    expect(screen.queryByTestId('setDefaultRepositoryButton-repo2')).not.toBeInTheDocument();
    expect(await screen.findByTestId('deleteRepositoryButton-repo2')).toBeInTheDocument();
  });

  it('confirms before changing the default repository from the table', async () => {
    const { onSetDefaultRepository } = renderTable({
      repositories: [{ name: 'repo2', type: 'fs', settings: { location: '/tmp' } } as any],
      defaultRepository: 'repo1',
      onSetDefaultRepository: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    fireEvent.click(screen.getByTestId('repositoryActionsMenuButton-repo2'));
    fireEvent.click(await screen.findByTestId('setDefaultRepositoryButton-repo2'));

    expect(await screen.findByTestId('confirmDefaultRepositoryModal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change default'));

    await waitFor(() => {
      expect(onSetDefaultRepository).toHaveBeenCalledWith('repo2');
      expect(mockToastNotifications.addSuccess).toHaveBeenCalled();
    });
  });

  it('disables multi-select for the default repository', () => {
    renderTable({ defaultRepository: 'repo1' });

    const table = screen.getByTestId('repositoryTable');
    const checkboxes = within(table).getAllByRole('checkbox');
    const rowCheckboxes = checkboxes.filter(
      (el) => !/select all/i.test(el.getAttribute('aria-label') ?? '')
    );

    expect(rowCheckboxes.length).toBeGreaterThan(0);
    expect(rowCheckboxes[0]).toBeDisabled();
  });

  it('clears an existing selection when the repository becomes the default', async () => {
    const { rerender } = renderTable({ defaultRepository: null });

    const table = screen.getByTestId('repositoryTable');
    const checkboxes = within(table).getAllByRole('checkbox');
    const rowCheckboxes = checkboxes.filter(
      (el) => !/select all/i.test(el.getAttribute('aria-label') ?? '')
    );

    expect(rowCheckboxes[0]).not.toBeDisabled();
    fireEvent.click(rowCheckboxes[0]);
    expect(rowCheckboxes[0]).toBeChecked();

    rerender(
      <I18nProvider>
        <RepositoryTable
          repositories={[{ name: 'repo1', type: 'fs', settings: { location: '/tmp' } } as any]}
          defaultRepository="repo1"
          managedRepository={undefined}
          onSetDefaultRepository={jest.fn().mockResolvedValue({})}
          reload={jest.fn()}
          openRepositoryDetailsUrl={(name) => `/repositories/${encodeURIComponent(name)}`}
          onRepositoryDeleted={jest.fn()}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      const updatedTable = screen.getByTestId('repositoryTable');
      const updatedCheckboxes = within(updatedTable).getAllByRole('checkbox');
      const updatedRowCheckboxes = updatedCheckboxes.filter(
        (el) => !/select all/i.test(el.getAttribute('aria-label') ?? '')
      );

      expect(updatedRowCheckboxes[0]).toBeDisabled();
      expect(updatedRowCheckboxes[0]).not.toBeChecked();
    });
  });
});
