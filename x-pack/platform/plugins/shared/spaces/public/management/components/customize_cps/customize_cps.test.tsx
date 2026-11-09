/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

import { asSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CustomizeCps } from './customize_cps';

describe('CustomizeCps', () => {
  const mockOnChange = jest.fn();

  const originProject = {
    _alias: 'local_project',
    _id: 'abcde1234567890',
    _organization: 'org1234567890',
    _type: 'observability',
    env: 'local',
  };

  const linkedProject = {
    _alias: 'linked_local_project',
    _id: 'badce1234567890',
    _organization: 'org1234567890',
    _type: 'observability',
    env: 'local',
    key1: 'value1',
  };

  const mockFetchProjects = jest.fn().mockImplementation(async (projectRouting?: string) => {
    // When scoped to "This project" we should not return linked projects.
    if (projectRouting === '_alias:_origin') {
      return { origin: originProject, linkedProjects: [] };
    }

    // Default (all projects) includes linked projects.
    return { origin: originProject, linkedProjects: [linkedProject] };
  });

  const mockCpsManager = {
    fetchProjects: mockFetchProjects,
    getConfigurationLinks: jest.fn(),
  };

  const defaultSpace: { id: SpaceId; name: string; projectRouting?: string } = {
    id: asSpaceId('test-space'),
    name: 'Test Space',
    projectRouting: '_alias:*',
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
          'Cross-project search allows searching across this project and any linked projects. Use this setting to define which projects to search by default when running queries from this space.'
        )
      ).toBeInTheDocument();
      expect(await screen.findByText('Cross-project search default scope')).toBeInTheDocument();
    });

    it('renders project picker section', async () => {
      renderComponent(defaultSpace);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockCpsManager.fetchProjects).toHaveBeenCalled();
      });

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();

      expect(await getProjectSwitchButton(originProject._id)).toBeEnabled();
      expect(await getProjectContextMenuButton(originProject._id)).toBeEnabled();
      expect(await getProjectSwitchButton(linkedProject._id)).toBeEnabled();
      expect(await getProjectContextMenuButton(linkedProject._id)).toBeEnabled();
    });

    it('renders with a space that has no projectRouting', async () => {
      const spaceWithoutRouting = {
        id: asSpaceId('test-space'),
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

      expect(await getProjectSwitchButton(originProject._id)).toBeDisabled();
      expect(await getProjectSwitchButton(linkedProject._id)).toBeDisabled();
      expect(await getProjectContextMenuButton(originProject._id)).toBeDisabled();
      expect(await getProjectContextMenuButton(linkedProject._id)).toBeDisabled();
    });

    it('allows the user to select project routing if the user has the manage_space_default capability', async () => {
      const user = userEvent.setup();

      const capabilities = {
        project_routing: { manage_space_default: true },
      };

      renderComponent(defaultSpace, mockOnChange, capabilities);

      expect(await screen.findByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();

      await user.click(await getProjectSwitchButton(originProject._id));

      expect(mockOnChange).toHaveBeenLastCalledWith({
        id: asSpaceId('test-space'),
        name: 'Test Space',
        projectRouting: `_alias:* AND (_id:* AND NOT _id:${originProject._id})`,
      });

      await user.click(await getProjectSwitchButton(originProject._id));

      expect(await screen.findByText('local_project')).toBeInTheDocument();
      expect(await screen.findByText('linked_local_project')).toBeInTheDocument();

      expect(mockOnChange).toHaveBeenLastCalledWith({
        id: asSpaceId('test-space'),
        name: 'Test Space',
        projectRouting: '_alias:*',
      });
    });
  });

  async function getProjectSwitchButton(projectId: string) {
    return await screen.findByTestId(`projectPickerListItemSwitch-${projectId}`);
  }

  async function getProjectContextMenuButton(projectId: string) {
    return await screen.findByTestId(`projectPickerListItemContextMenu-${projectId}`);
  }
});
