/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import type { Query, AggregateQuery } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';

import { renderWithReduxStore } from '../../../mocks';
import { mockVisualizationMap, mockDatasourceMap, mockDataPlugin } from '../../../mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';
import { LensEditConfigurationFlyout } from './lens_configuration_flyout';
import type { EditConfigPanelProps } from './types';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { isEqual } from 'lodash';
import * as getApplicationUserMessagesModule from '../../get_application_user_messages';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { CoreEnvContextProvider } from '@kbn/react-kibana-context-env';

const createAddContextMock = () => {
  return jest
    .fn()
    .mockImplementation((element) => (
      <CoreEnvContextProvider value={coreContextMock.create().env}>
        {element}
      </CoreEnvContextProvider>
    ));
};

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLResults: jest.fn().mockResolvedValue({
      response: {
        columns: [
          {
            name: '@timestamp',
            id: '@timestamp',
            meta: {
              type: 'date',
            },
          },
          {
            name: 'bytes',
            id: 'bytes',
            meta: {
              type: 'number',
            },
          },
          {
            name: 'memory',
            id: 'memory',
            meta: {
              type: 'number',
            },
          },
        ],
        values: [],
      },
    }),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('index1'),
    getESQLAdHocDataview: jest.fn().mockResolvedValue({}),
    formatESQLColumns: jest.fn().mockReturnValue([
      {
        name: '@timestamp',
        id: '@timestamp',
        meta: {
          type: 'date',
        },
      },
      {
        name: 'bytes',
        id: 'bytes',
        meta: {
          type: 'number',
        },
      },
      {
        name: 'memory',
        id: 'memory',
        meta: {
          type: 'number',
        },
      },
    ]),
  };
});

// Shared state object for reference equality in isEqual comparisons
const mockFormBasedState = { layers: {} };
// Different state to simulate changes detected
const mockFormBasedStateChanged = { layers: { layer1: {} } };

const lensAttributes = {
  title: 'test',
  visualizationType: 'testVis',
  state: {
    datasourceStates: {
      formBased: mockFormBasedStateChanged,
    },
    visualization: {},
    filters: [],
    query: {
      esql: 'from index1 | limit 10',
    },
  },
  filters: [],
  query: {
    esql: 'from index1 | limit 10',
  },
  references: [],
} as unknown as TypedLensSerializedState['attributes'];
const mockStartDependencies =
  createMockStartDependencies() as unknown as LensPluginStartDependencies;

jest.spyOn(getApplicationUserMessagesModule, 'useApplicationUserMessages');

const data = {
  ...mockDataPlugin(),
  query: {
    ...mockDataPlugin().query,
    timefilter: {
      ...mockDataPlugin().query.timefilter,
      timefilter: {
        ...mockDataPlugin().query.timefilter.timefilter,
        getTime: jest.fn(() => ({
          from: 'now-2m',
          to: 'now',
        })),
        getAbsoluteTime: jest.fn(() => ({
          from: '2021-01-10T04:00:00.000Z',
          to: '2021-01-10T04:00:00.000Z',
        })),
      },
    },
  },
};
const startDependencies = {
  ...mockStartDependencies,
  data,
};
const datasourceMap = mockDatasourceMap();
const visualizationMap = mockVisualizationMap();

/** Test overrides: may include datasourceMap for Provider (not on EditConfigPanelProps). */
type LensConfigFlyoutTestOverrides = Partial<EditConfigPanelProps> & {
  datasourceMap?: ReturnType<typeof mockDatasourceMap>;
};

describe('LensEditConfigurationFlyout', () => {
  async function renderConfigFlyout(
    propsOverrides: LensConfigFlyoutTestOverrides = {},
    query?: Query | AggregateQuery,
    stateOverrides: { hideTextBasedEditor?: boolean } & Partial<{
      datasourceStates: Record<string, { isLoading: boolean; state: unknown }>;
      activeDatasourceId: string;
    }> = {}
  ) {
    const mockCoreStart = coreMock.createStart();
    mockCoreStart.rendering.addContext = createAddContextMock();
    const datasourceMapToUse = propsOverrides.datasourceMap ?? datasourceMap;
    const { container, ...rest } = renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={visualizationMap}
        datasourceMap={datasourceMapToUse}
      >
        {mockCoreStart.rendering.addContext(
          <LensEditConfigurationFlyout
            attributes={lensAttributes}
            updatePanelState={jest.fn()}
            coreStart={mockCoreStart}
            startDependencies={startDependencies}
            closeFlyout={jest.fn()}
            onApply={jest.fn()}
            onCancel={jest.fn()}
            {...propsOverrides}
          />
        )}
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          datasourceStates: {
            formBased: {
              isLoading: false,
              state: mockFormBasedState,
            },
          },
          activeDatasourceId: 'formBased',
          query: query as Query,
          visualization: {
            state: {},
            activeId: 'testVis',
            selectedLayerId: 'layer1',
          },
          ...stateOverrides,
        },
      }
    );
    await waitFor(() => container.querySelector('lnsEditFlyoutBody'));
    return { container, ...rest };
  }

  it('should display the header and the link to editor if necessary props are given', async () => {
    const navigateToLensEditorSpy = jest.fn();
    await renderConfigFlyout({
      displayFlyoutHeader: true,
      navigateToLensEditor: navigateToLensEditorSpy,
    });
    expect(screen.getByTestId('editFlyoutHeader')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('navigateToLensEditorLink'));
    expect(navigateToLensEditorSpy).toHaveBeenCalled();
  });

  it('should display the header title correctly for a newly created panel', async () => {
    await renderConfigFlyout({
      displayFlyoutHeader: true,
      isNewPanel: true,
    });
    expect(screen.getByTestId('inlineEditingFlyoutLabel').textContent).toBe('Configuration');
  });

  it('should call the closeFlyout callback if cancel button is clicked', async () => {
    const closeFlyoutSpy = jest.fn();

    await renderConfigFlyout({
      closeFlyout: closeFlyoutSpy,
    });
    expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(closeFlyoutSpy).toHaveBeenCalled();
  });

  it('should call the updatePanelState callback if cancel button is clicked', async () => {
    const updatePanelStateSpy = jest.fn();
    await renderConfigFlyout({
      updatePanelState: updatePanelStateSpy,
    });
    expect(screen.getByTestId('lns-layerPanel-0')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(updatePanelStateSpy).toHaveBeenCalled();
  });

  it('should call the updateByRefInput callback if cancel button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();

    await renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
    });
    await userEvent.click(screen.getByTestId('cancelFlyoutButton'));
    expect(updateByRefInputSpy).toHaveBeenCalled();
  });

  it('should call the saveByRef callback if apply button is clicked and savedObjectId exists', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();

    await renderConfigFlyout({
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
    });
    await userEvent.click(screen.getByTestId('applyFlyoutButton'));
    expect(updateByRefInputSpy).toHaveBeenCalled();
    expect(saveByRefSpy).toHaveBeenCalled();
  });

  it('should call the onApplyCb callback if apply button is clicked', async () => {
    const onApplyCbSpy = jest.fn();

    await renderConfigFlyout(
      {
        closeFlyout: jest.fn(),
        onApply: onApplyCbSpy,
      },
      { esql: 'from index1 | limit 10' }
    );
    await userEvent.click(screen.getByTestId('applyFlyoutButton'));
    expect(onApplyCbSpy).toHaveBeenCalledWith({
      title: 'test',
      visualizationType: 'testVis',
      state: {
        datasourceStates: { formBased: mockFormBasedState },
        visualization: {},
        filters: [],
        query: { esql: 'from index1 | limit 10' },
      },
      filters: [],
      query: { esql: 'from index1 | limit 10' },
      references: [],
    });
  });

  it('should not display the editor if query is not text based', async () => {
    await renderConfigFlyout({
      attributes: {
        ...lensAttributes,
        state: {
          ...lensAttributes.state,
          query: {
            type: 'kql',
            query: '',
          } as unknown as Query,
        },
      },
    });
    expect(screen.queryByTestId('ESQLEditor')).toBeNull();
  });

  // This test simulates the Discover editing use case where both the ES|QL editor
  // and suggestions should be hidden. The hideTextBasedEditor flag is set by the
  // parent application (e.g., Discover) to control the flyout layout.
  it('should not display the suggestions if hideTextBasedEditor and hidesSuggestions are both true', async () => {
    await renderConfigFlyout(
      {
        hidesSuggestions: true,
        attributes: {
          ...lensAttributes,
          state: {
            ...lensAttributes.state,
            query: {
              type: 'kql',
              query: '',
            } as unknown as Query,
          },
        },
      },
      undefined,
      { hideTextBasedEditor: true }
    );
    expect(screen.queryByTestId('InlineEditingSuggestions')).toBeNull();
  });

  it('should display the suggestions if query is ES|QL', async () => {
    await renderConfigFlyout(
      {},
      {
        esql: 'from index1 | limit 10',
      }
    );
    expect(screen.getByTestId('InlineEditingESQLEditor')).toBeInTheDocument();
    expect(screen.getByTestId('InlineEditingSuggestions')).toBeInTheDocument();
  });

  it('should display the ES|QL results table if hideTextBasedEditor is false and query is ES|QL', async () => {
    await renderConfigFlyout({ hideTextBasedEditor: false }, { esql: 'from index1 | limit 10' });
    await waitFor(() => expect(screen.getByTestId('ESQLQueryResults')).toBeInTheDocument());
  });

  it('save button is disabled if no changes have been made', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();
    const newProps = {
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
      attributes: lensAttributes,
    };
    // Set formBased to match the preloaded Redux state so no changes are detected. For formBased we compare current (from getPersistableState(Redux state)) with previous (attributes state + refs) as-is.
    newProps.attributes.state.datasourceStates.formBased = mockFormBasedState;
    await renderConfigFlyout(newProps);
    expect(screen.getByRole('button', { name: /apply and close/i })).toBeDisabled();
  });

  it('formBased only calls getPersistableState on current (Redux) state, not on previous (attributes) state', async () => {
    const formBasedWithSpy = {
      ...datasourceMap.formBased,
      getPersistableState: jest.fn((x: unknown) => ({
        state: x,
        references: [{ type: 'index-pattern', id: 'mockip', name: 'mockip' }],
      })),
    };
    const attributesWithFormBased = {
      ...lensAttributes,
      state: { ...lensAttributes.state, datasourceStates: { formBased: mockFormBasedState } },
    };
    await renderConfigFlyout({
      attributes: attributesWithFormBased,
      datasourceMap: { ...datasourceMap, formBased: formBasedWithSpy } as ReturnType<
        typeof mockDatasourceMap
      >,
    });
    expect(formBasedWithSpy.getPersistableState).toHaveBeenCalledTimes(1);
    expect(formBasedWithSpy.getPersistableState).toHaveBeenCalledWith(mockFormBasedState);
  });

  it('Apply and close is disabled for textBased when runtime state differs only by private fields (e.g. indexPatternRefs)', async () => {
    // Verifies textBased normalizes both current and previous to persistable so private fields (e.g. indexPatternRefs) do not mark the panel dirty.
    const textBasedPersistableState = {
      layers: {
        layerA: {
          columns: [
            {
              columnId: 'col1',
              fieldName: 'bytes',
              meta: { type: 'number' },
            },
          ],
          query: { esql: 'FROM my-index | STATS bytes = SUM(bytes)' },
        },
      },
    };
    const textBasedRuntimeState = {
      ...textBasedPersistableState,
      indexPatternRefs: [{ id: 'dv-1', title: 'my-index', name: 'my-index' }],
    };
    const textBasedDatasource = {
      ...datasourceMap.textBased,
      getPersistableState: jest.fn((state: { layers: unknown }) => ({
        state: { layers: state.layers },
        references: [],
      })),
      isEqual: jest.fn(
        (
          persistable1: { layers?: unknown },
          _refs1: unknown[],
          persistable2: { layers?: unknown },
          _refs2: unknown[]
        ) => isEqual(persistable1?.layers, persistable2?.layers)
      ),
    };
    const textBasedAttributes = {
      ...lensAttributes,
      state: {
        ...lensAttributes.state,
        datasourceStates: {
          textBased: textBasedPersistableState,
        },
        query: { esql: 'FROM my-index | STATS bytes = SUM(bytes)' },
      },
    } as unknown as TypedLensSerializedState['attributes'];

    await renderConfigFlyout(
      {
        attributes: textBasedAttributes,
        datasourceMap: { ...datasourceMap, textBased: textBasedDatasource } as ReturnType<
          typeof mockDatasourceMap
        >,
      },
      { esql: 'FROM my-index | STATS bytes = SUM(bytes)' },
      {
        datasourceStates: {
          textBased: { isLoading: false, state: textBasedRuntimeState },
        },
        activeDatasourceId: 'textBased',
      }
    );

    expect(screen.getByRole('button', { name: /apply and close/i })).toBeDisabled();
  });

  it('save button should be disabled if expression cannot be generated', async () => {
    const updateByRefInputSpy = jest.fn();
    const saveByRefSpy = jest.fn();
    const newProps: LensConfigFlyoutTestOverrides = {
      closeFlyout: jest.fn(),
      updateByRefInput: updateByRefInputSpy,
      savedObjectId: 'id',
      saveByRef: saveByRefSpy,
      datasourceMap: {
        ...datasourceMap,
        formBased: {
          ...datasourceMap.formBased,
          toExpression: jest.fn(() => null),
        },
      } as unknown as ReturnType<typeof mockDatasourceMap>,
    };

    await renderConfigFlyout(newProps);
    expect(screen.getByRole('button', { name: /apply and close/i })).toBeDisabled();
  });

  it('should use correct activeVisualization', async () => {
    const visualizationType = 'testVis';

    await renderConfigFlyout({
      attributes: {
        ...lensAttributes,
        visualizationType,
      },
    });

    expect(getApplicationUserMessagesModule.useApplicationUserMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        visualizationType,
      })
    );
  });
});
