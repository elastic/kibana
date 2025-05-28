/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Visualization } from '../../../types';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  FrameMock,
  renderWithReduxStore,
} from '../../../mocks';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { updateVisualizationState, LensAppState } from '../../../state_management';
import { setChangesApplied } from '../../../state_management/lens_slice';
import { LensInspector } from '../../../lens_inspector_service';
import { act, screen } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import { SettingsMenu } from '../../../app_plugin/settings_menu';
import userEvent from '@testing-library/user-event';

describe('workspace_panel_wrapper', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockFrameAPI: FrameMock;
  const ToolbarComponentMock = jest.fn(() => null);

  const renderWorkspacePanelWrapper = (
    propsOverrides = {},
    { preloadedState }: { preloadedState: Partial<LensAppState> } = { preloadedState: {} }
  ) => {
    const { store, ...rtlRender } = renderWithReduxStore(
      <>
        <WorkspacePanelWrapper
          framePublicAPI={mockFrameAPI}
          visualizationId="myVis"
          visualizationMap={{
            myVis: { ...mockVisualization, ToolbarComponent: ToolbarComponentMock },
          }}
          datasourceMap={{}}
          datasourceStates={{}}
          isFullscreen={false}
          lensInspector={{} as unknown as LensInspector}
          getUserMessages={() => []}
          children={<span />}
          displayOptions={undefined}
          {...propsOverrides}
        />
        <SettingsMenu
          anchorElement={document.createElement('button')}
          isOpen
          onClose={jest.fn()}
          {...propsOverrides}
        />
      </>,
      {},
      { preloadedState }
    );

    const getApplyChangesToolbar = () => {
      return screen.queryByTestId('lnsApplyChanges__toolbar');
    };

    const toggleAutoApply = async () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      await userEvent.click(autoApplyToggle);
    };

    const isAutoApplyOn = () => {
      const autoApplyToggle = screen.getByTestId('lnsToggleAutoApply');
      return autoApplyToggle.getAttribute('aria-checked') === 'true';
    };

    const editVisualization = () => {
      store.dispatch(
        updateVisualizationState({
          visualizationId: store.getState().lens.visualization.activeId as string,
          newState: { something: 'changed' },
        })
      );
    };

    return {
      getApplyChangesToolbar,
      toggleAutoApply,
      isAutoApplyOn,
      store,
      editVisualization,
      ...rtlRender,
    };
  };

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockFrameAPI = createMockFramePublicAPI();
    ToolbarComponentMock.mockClear();
  });

  it('should render its children', async () => {
    const customElementText = faker.word.words();
    renderWorkspacePanelWrapper({ children: <span>{customElementText}</span> });
    expect(screen.getByText(customElementText)).toBeInTheDocument();
  });

  it('should call the toolbar renderer if provided', async () => {
    const visState = { internalState: 123 };
    renderWorkspacePanelWrapper(
      {},
      {
        preloadedState: {
          visualization: { activeId: 'myVis', state: visState },
          datasourceStates: {},
        },
      }
    );

    expect(ToolbarComponentMock).toHaveBeenCalledWith({
      state: visState,
      frame: mockFrameAPI,
      setState: expect.anything(),
    });
  });

  describe('auto-apply controls', () => {
    it('shows and hides apply-changes button depending on whether auto-apply is enabled', async () => {
      const { toggleAutoApply, getApplyChangesToolbar } = renderWorkspacePanelWrapper();
      await toggleAutoApply();
      expect(getApplyChangesToolbar()).toBeInTheDocument();
      await toggleAutoApply();
      expect(getApplyChangesToolbar()).not.toBeInTheDocument();
      await toggleAutoApply();
      expect(getApplyChangesToolbar()).toBeInTheDocument();
    });

    it('apply-changes button applies changes', async () => {
      const { store, toggleAutoApply, getApplyChangesToolbar, editVisualization } =
        renderWorkspacePanelWrapper();
      await toggleAutoApply();
      expect(getApplyChangesToolbar()).toBeDisabled();

      // make a change
      act(() => {
        editVisualization();
      });

      // // simulate workspace panel behavior
      act(() => {
        store.dispatch(setChangesApplied(false));
      });

      expect(getApplyChangesToolbar()).not.toBeDisabled();

      // // simulate workspace panel behavior
      act(() => {
        store.dispatch(setChangesApplied(true));
      });
      expect(getApplyChangesToolbar()).toBeDisabled();
    });

    it('enabling auto apply while having unapplied changes works', async () => {
      const { store, toggleAutoApply, getApplyChangesToolbar, editVisualization } =
        renderWorkspacePanelWrapper();
      await toggleAutoApply();
      act(() => {
        editVisualization();
      });

      // simulate workspace panel behavior
      act(() => {
        store.dispatch(setChangesApplied(false));
      });
      expect(getApplyChangesToolbar()).not.toBeDisabled();
      await toggleAutoApply();
      expect(getApplyChangesToolbar()).not.toBeInTheDocument();
    });
  });
});
