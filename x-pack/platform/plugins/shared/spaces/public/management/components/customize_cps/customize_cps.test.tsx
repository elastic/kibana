/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CustomizeCps } from './customize_cps';

describe('CustomizeCps', () => {
  const mockOnChange = jest.fn();
  const mockFetchProjects = jest.fn().mockResolvedValue({
    origin: {
      _alias: 'local_project',
      _id: 'abcde1234567890',
      _organization: 'org1234567890',
      _type: 'observability',
      env: 'local',
    },
    linkedProjects: [
      {
        _alias: 'linked_local_project',
        _id: 'badce1234567890',
        _organization: 'org1234567890',
        _type: 'observability',
        env: 'local',
        key1: 'value1',
      },
    ],
  });
  const mockCpsManager = {
    fetchProjects: mockFetchProjects,
  };

  const defaultSpace = {
    id: 'test-space',
    name: 'Test Space',
  };

  const renderComponent = (
    initialSpace = defaultSpace,
    onChange = mockOnChange,
    capabilities = { project_routing: { manage_space_default: true } }
  ) => {
    const TestWrapper = () => {
      const [space, setSpace] = useState(initialSpace);

      const handleChange = (updatedSpace: any) => {
        setSpace(updatedSpace);
        if (onChange) {
          onChange(updatedSpace);
        }
      };

      return (
        <KibanaContextProvider
          services={{
            cps: {
              cpsManager: mockCpsManager,
            },
            application: {
              capabilities,
            },
          }}
        >
          <CustomizeCps space={space} onChange={handleChange} />
        </KibanaContextProvider>
      );
    };

    return renderWithI18n(<TestWrapper />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form component with correct structure', async () => {
      renderComponent();

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      const heading = await screen.findByRole('heading', { name: `Cross-project search` });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Cross-project search');

      expect(
        await screen.findByText(
          'Search across this project and any linked projects from a single location with cross-project search. ' +
            'Use these settings to limit the space default scope to a specific subset of projects.'
        )
      ).toBeInTheDocument();
      expect(await screen.findByText('Cross-project search default scope')).toBeInTheDocument();
    });

    it('renders project picker component', async () => {
      renderComponent(defaultSpace);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockCpsManager.fetchProjects).toHaveBeenCalled();
      });

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();
      expect(await screen.findByText('ABCDE1234567890')).toBeInTheDocument();
      expect(await screen.findByText('BADCE1234567890')).toBeInTheDocument();

      expect(await getAllProjectsButton()).toBeInTheDocument();
      expect(await getThisProjectButton()).toBeInTheDocument();
    });

    it('renders with a space that has no projectRouting', async () => {
      const spaceWithoutRouting = {
        id: 'test-space',
        name: 'Test Space',
      };
      renderComponent(spaceWithoutRouting);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockCpsManager.fetchProjects).toHaveBeenCalled();
      });

      expect(await screen.findByText('local_project')).toBeInTheDocument();
    });

    it('calls fetchProjects from cpsManager when component mounts', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockFetchProjects).toHaveBeenCalled();
      });
    });
  });

  describe('Capabilities and permissions', () => {
    it('renders when user has manage_space_default capability', async () => {
      const capabilities = {
        project_routing: { manage_space_default: true },
      };
      renderComponent(defaultSpace, mockOnChange, capabilities);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
    });

    it('disables project picker when user does not have manage_space_default capability', async () => {
      const capabilities = {
        project_routing: { manage_space_default: false },
      };
      renderComponent(defaultSpace, mockOnChange, capabilities);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      expect(await getAllProjectsButton()).toBeDisabled();
      expect(await getThisProjectButton()).toBeDisabled();
    });

    it('allows the user to select project routing if the user has the manage_space_default capability', async () => {
      const capabilities = {
        project_routing: { manage_space_default: true },
      };
      renderComponent(defaultSpace, mockOnChange, capabilities);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();

      await userEvent.click(await getThisProjectButton());

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(screen.queryByText('linked_local_project')).not.toBeInTheDocument();
      expect(mockOnChange).toHaveBeenCalledWith({
        id: 'test-space',
        name: 'Test Space',
        projectRouting: '_alias:_origin',
      });

      await userEvent.click(await getAllProjectsButton());

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();
      expect(mockOnChange).toHaveBeenCalledWith({
        id: 'test-space',
        name: 'Test Space',
        projectRouting: '_alias:*',
      });
    });
  });

  async function getAllProjectsButton() {
    return await screen.findByRole('button', { name: `All projects` });
  }

  async function getThisProjectButton() {
    return await screen.findByRole('button', { name: `This project` });
  }
});
