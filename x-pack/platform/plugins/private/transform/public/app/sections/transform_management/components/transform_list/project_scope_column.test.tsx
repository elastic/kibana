/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ICPSManager } from '@kbn/cps-utils';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { ProjectScopeColumn } from './project_scope_column';

const originProject = {
  _id: 'origin-project',
  _alias: 'Origin project',
  _type: 'security',
  _organisation: 'elastic',
};

const linkedProject = {
  _id: 'linked-project',
  _alias: 'Linked project',
  _type: 'observability',
  _organisation: 'elastic',
};

const createLinkedProject = (id: number) => ({
  _id: `linked-project-${id}`,
  _alias: `Linked project ${id}`,
  _type: 'observability',
  _organisation: 'elastic',
});

const renderProjectScopeColumn = (cpsManager: ICPSManager, projectRouting?: string) => {
  return render(
    <I18nProvider>
      <EuiThemeProvider>
        <ProjectScopeColumn cpsManager={cpsManager} projectRouting={projectRouting} />
      </EuiThemeProvider>
    </I18nProvider>
  );
};

describe('ProjectScopeColumn', () => {
  const fetchProjects = jest.fn().mockResolvedValue({
    origin: originProject,
    linkedProjects: [linkedProject],
  });
  const cpsManager = {
    fetchProjects,
    getTotalProjectCount: jest.fn(() => 2),
  } as unknown as ICPSManager;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a read-only project list without routing buttons', async () => {
    renderProjectScopeColumn(cpsManager, PROJECT_ROUTING.ALL);

    expect(screen.getByTestId('transformListProjectScopeButton')).toHaveTextContent('All');

    await userEvent.click(screen.getByTestId('transformListProjectScopeButton'));

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalledWith(PROJECT_ROUTING.ALL);
    });

    expect(screen.getByText('Origin project')).toBeInTheDocument();
    expect(screen.getByText('Linked project')).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Cross-project search project picker' })
    ).not.toBeInTheDocument();
  });

  it('uses origin routing when project routing is not configured', async () => {
    renderProjectScopeColumn(cpsManager);

    const button = screen.getByTestId('transformListProjectScopeButton');
    expect(within(button).getByText('This project')).toBeInTheDocument();

    await userEvent.click(button);

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalledWith(PROJECT_ROUTING.ORIGIN);
    });
  });

  it('displays selected project count for custom project routing', async () => {
    fetchProjects.mockResolvedValueOnce({
      origin: originProject,
      linkedProjects: [1, 2, 3, 4].map(createLinkedProject),
    });

    renderProjectScopeColumn(
      {
        ...cpsManager,
        getTotalProjectCount: jest.fn(() => 10),
      } as unknown as ICPSManager,
      'custom-project-routing'
    );

    await waitFor(() => {
      expect(screen.getByTestId('transformListProjectScopeButton')).toHaveTextContent('5/10');
    });

    expect(fetchProjects).toHaveBeenCalledWith('custom-project-routing');
  });

  it('displays selected project count and opens popover for linked-only project routing', async () => {
    fetchProjects.mockResolvedValue({
      origin: null,
      linkedProjects: [linkedProject],
    });

    renderProjectScopeColumn(cpsManager, '_alias:linked_local_project');

    const button = await screen.findByTestId('transformListProjectScopeButton');
    await waitFor(() => {
      expect(button).toHaveTextContent('1/2');
    });

    await userEvent.click(button);

    expect(await screen.findByText('Linked project')).toBeInTheDocument();
    expect(screen.queryByText('_alias:linked_local_project')).not.toBeInTheDocument();
  });

  it('uses neutral text while loading custom project routing', async () => {
    let resolveProjects: (value: { origin: typeof originProject; linkedProjects: [] }) => void;
    fetchProjects.mockReturnValue(
      new Promise((resolve) => {
        resolveProjects = resolve;
      })
    );

    const { unmount } = renderProjectScopeColumn(cpsManager, '_alias:linked_local_project');

    expect(screen.getByTestId('transformListProjectScopeButton')).toHaveTextContent('Loading');
    expect(screen.queryByText('_alias:linked_local_project')).not.toBeInTheDocument();

    resolveProjects!({ origin: originProject, linkedProjects: [] });
    await waitFor(() => {
      expect(screen.getByTestId('transformListProjectScopeButton')).toHaveTextContent('1/2');
    });
    unmount();
  });

  it('uses neutral text when custom project routing cannot be resolved', async () => {
    fetchProjects.mockRejectedValueOnce(new Error('Failed to load projects'));

    renderProjectScopeColumn(cpsManager, '_alias:linked_local_project');

    await waitFor(() => {
      expect(screen.getByTestId('transformListProjectScopeButton')).toHaveTextContent('Unknown');
    });
    expect(screen.queryByText('_alias:linked_local_project')).not.toBeInTheDocument();
  });
});
