/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChildDragDropProvider, Droppable, Draggable } from '@kbn/dom-drag-drop';
import { FramePublicAPI, Visualization, VisualizationConfigProps } from '../../../types';
import { LayerPanel } from './layer_panel';
import { coreMock } from '@kbn/core/public/mocks';
import { faker } from '@faker-js/faker';
import { generateId } from '../../../id_generator';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
  mountWithProvider,
  createMockedDragDropContext,
  renderWithReduxStore,
} from '../../../mocks';
import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';
import { DimensionButton } from '@kbn/visualization-ui-components';
import { LensAppState } from '../../../state_management';
import type { ProviderProps } from '@kbn/dom-drag-drop/src';
import { LayerPanelProps } from './types';

jest.mock('../../../id_generator');

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-utils-plugin/public');
  return {
    ...original,
    Storage: class Storage {
      get = () => ({ skipDeleteModal: true });
    },
  };
});

const draggingOperation = {
  layerId: 'first',
  columnId: 'a',
  id: 'a',
  humanData: { label: 'Label' },
  ghost: {
    children: <button>Hello!</button>,
    style: {},
  },
};
const defaultGroup = {
  accessors: [],
  supportsMoreColumns: true,
  groupLabel: 'A',
  groupId: 'a',
  filterOperations: () => true,
  dataTestSubj: 'lnsGroupTestId',
};

const draggingField = {
  field: { name: 'dragged' },
  indexPatternId: 'a',
  id: '1',
  humanData: { label: 'Label' },
  ghost: {
    children: <button>Hello!</button>,
    style: {},
  },
};

const onDropToDimension = jest.fn();

describe('LayerPanel', () => {
  let mockVisualization: jest.Mocked<Visualization>;

  let mockDatasource = createMockDatasource('testDatasource');

  function getDefaultProps() {
    return {
      layerId: 'first',
      visualizationMap: {
        testVis: mockVisualization,
      },
      activeVisualization: mockVisualization,
      dimensionGroups: mockVisualization.getConfiguration({} as VisualizationConfigProps).groups,
      datasourceMap: {
        testDatasource: mockDatasource,
      },
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateDatasourceAsync: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: {
        ...createMockFramePublicAPI(),
        datasourceLayers: {
          first: mockDatasource.publicAPIMock,
        },
      } as FramePublicAPI,
      isOnlyLayer: true,
      addLayer: jest.fn(),
      onRemoveLayer: jest.fn(),
      onCloneLayer: jest.fn(),
      onRemoveDimension: jest.fn(),
      dispatch: jest.fn(),
      core: coreMock.createStart(),
      layerIndex: 0,
      registerNewLayerRef: jest.fn(),
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      onEmptyDimensionAdd: jest.fn(),
      onChangeIndexPattern: jest.fn(),
      registerLibraryAnnotationGroup: jest.fn(),
      indexPatternService: createIndexPatternServiceMock(),
      getUserMessages: () => [],
      displayLayerSettings: true,
      onDropToDimension,
    };
  }
  let props: LayerPanelProps;

  const renderLayerPanel = (
    propsOverrides: Partial<LayerPanelProps> = {},
    { preloadedState }: { preloadedState: Partial<LensAppState> } = { preloadedState: {} },
    dragDropValue: ProviderProps['value'] = createMockedDragDropContext()
  ) => {
    props = getDefaultProps();
    const { store, ...rtlRender } = renderWithReduxStore(
      <LayerPanel {...props} {...propsOverrides} />,
      {
        wrapper: ({ children }) => (
          <ChildDragDropProvider value={dragDropValue}>{children}</ChildDragDropProvider>
        ),
      },
      { preloadedState }
    );

    return {
      store,
      ...rtlRender,
    };
  };

  beforeEach(() => {
    mockVisualization = createMockVisualization(faker.string.alphanumeric());
    mockVisualization.getLayerIds.mockReturnValue(['first']);
    mockDatasource = createMockDatasource();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('layer reset and remove', () => {
    it('should show the reset button when single layer', async () => {
      renderLayerPanel();
      expect(screen.getByRole('button', { name: /clear layer/i })).toBeInTheDocument();
    });
    it('should show the delete button when single layer', async () => {
      renderLayerPanel({ isOnlyLayer: false });
      expect(screen.getByRole('button', { name: /delete layer/i })).toBeInTheDocument();
    });

    it('should call the clear callback when resetting layer', async () => {
      const cb = jest.fn();
      renderLayerPanel({ onRemoveLayer: cb });
      await userEvent.click(screen.getByRole('button', { name: /clear layer/i }));
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('single group', () => {
    it('should render the group with a way to add a new column', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [defaultGroup],
      });

      renderLayerPanel();
      expect(screen.getAllByTestId('lnsGroupTestId')).toHaveLength(1);
    });
    it('should render the non-editable state and optional label', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'x' }],
            supportsMoreColumns: false,
          },
        ],
      });
      renderLayerPanel();
      expect(screen.getAllByTestId('lnsGroupTestId')).toHaveLength(1);
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('should hide the layer actions if displayLayerSettings is set to false', async () => {
      renderLayerPanel({ displayLayerSettings: false });
      expect(screen.queryByTestId('lnsLayerActions')).not.toBeInTheDocument();
    });

    it('does not render a hidden group', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          defaultGroup,
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            dataTestSubj: 'lnsGroupTestIdB',
            isHidden: true,
          },
        ],
      });

      renderLayerPanel();
      expect(screen.getAllByTestId('lnsGroupTestId')).toHaveLength(1);
      expect(screen.queryByTestId('lnsGroupTestIdB')).not.toBeInTheDocument();
    });

    it('should render the required warning when only one group is configured', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'x' }],
            supportsMoreColumns: false,
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            requiredMinDimensionCount: 1,
          },
        ],
      });

      renderLayerPanel();
      expect(screen.getAllByTestId('lnsGroupTestId')).toHaveLength(2);
      expect(screen.getByText('Requires field')).toBeInTheDocument();
    });

    it('should not render the required warning when the chart is empty', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            requiredMinDimensionCount: 1,
          },
        ],
      });

      renderLayerPanel();
      expect(screen.queryByText('Requires field')).not.toBeInTheDocument();
    });

    it('should render the required warning when the chart is empty but isInlineEditing', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            requiredMinDimensionCount: 1,
          },
        ],
      });

      renderLayerPanel({ setIsInlineFlyoutVisible: jest.fn() });
      expect(screen.queryByText('Requires field')).toBeInTheDocument();
    });

    it('should tell the user to remove the correct number of dimensions', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'x' }],
            supportsMoreColumns: false,
            dimensionsTooMany: 1,
          },
          {
            ...defaultGroup,
            groupLabel: 'C',
            groupId: 'c',
            accessors: [{ columnId: 'x' }],
            supportsMoreColumns: false,
            dimensionsTooMany: -1,
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            dimensionsTooMany: 3,
          },
        ],
      });
      renderLayerPanel();
      expect(screen.getAllByTestId('lnsGroupTestId')).toHaveLength(3);
      expect(screen.getByText('Please remove a dimension')).toBeInTheDocument();
      expect(screen.getByText('Please remove 3 dimensions')).toBeInTheDocument();
    });

    it.each`
      minDimensions | accessors | errors
      ${1}          | ${0}      | ${1}
      ${2}          | ${0}      | ${2}
      ${2}          | ${1}      | ${2}
    `(
      'should render the required warning for $errors fields when only one group is configured with requiredMinDimensionCount: $minDimensions and $accessors accessors',
      async ({ minDimensions, accessors, errors }) => {
        mockVisualization.getConfiguration.mockReturnValue({
          groups: [
            {
              ...defaultGroup,
              accessors: [{ columnId: 'x' }],
              supportsMoreColumns: false,
            },
            {
              ...defaultGroup,
              groupLabel: 'B',
              groupId: 'b',
              accessors: [{ columnId: 'y' }].slice(0, accessors),
              requiredMinDimensionCount: minDimensions,
            },
          ],
        });
        renderLayerPanel();
        const errorMessage = errors === 1 ? 'Requires field' : 'Requires 2 fields';
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      }
    );

    it.each`
      minDimensions | accessors
      ${0}          | ${0}
      ${0}          | ${1}
      ${1}          | ${1}
      ${1}          | ${2}
      ${2}          | ${2}
    `(
      'should not render the required warning when only one group is configured with requiredMinDimensionCount: $minDimensions and $accessors accessors',
      async ({ minDimensions, accessors }) => {
        mockVisualization.getConfiguration.mockReturnValue({
          groups: [
            {
              ...defaultGroup,
              accessors: [{ columnId: 'x' }],
              supportsMoreColumns: false,
            },
            {
              ...defaultGroup,
              groupLabel: 'B',
              groupId: 'b',
              accessors: [{ columnId: 'y' }, { columnId: 'z' }].slice(0, accessors),
              requiredMinDimensionCount: minDimensions,
            },
          ],
        });
        renderLayerPanel();
        expect(screen.queryByText(/Requires/)).not.toBeInTheDocument();
      }
    );

    it('should render visualization dimension editor when clicking on existing dimension', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            enableDimensionEditor: true,
          },
        ],
      });
      renderLayerPanel();
      await userEvent.click(screen.getByTestId('lnsLayerPanel-dimensionLink'));
      expect(screen.queryByTestId('lnsVisDimensionEditor')).toBeInTheDocument();
    });
    it('should not render visualization dimension editor when clicking on empty dimension', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            enableDimensionEditor: true,
          },
        ],
      });

      renderLayerPanel();
      await userEvent.click(screen.getByTestId('lns-empty-dimension'));
      expect(screen.queryByTestId('lnsVisDimensionEditor')).not.toBeInTheDocument();
    });
    it('should not break if visualization dimensionEditor is not defined', async () => {
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            enableDimensionEditor: true,
          },
        ],
      });
      mockVisualization.DimensionEditorComponent = undefined;
      renderLayerPanel();
      await userEvent.click(screen.getByTestId('lnsLayerPanel-dimensionLink'));
      expect(screen.queryByTestId('lnsVisDimensionEditor')).not.toBeInTheDocument();
    });
    it('should not update the visualization if the datasource is incomplete', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      const updateAll = jest.fn();
      const updateDatasourceAsync = jest.fn();

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [{ ...defaultGroup, accessors: [{ columnId: 'newid' }] }],
      });

      renderLayerPanel({
        updateAll,
        updateDatasourceAsync,
      });

      await userEvent.click(screen.getByTestId('lns-empty-dimension'));

      expect(mockDatasource.DimensionEditorComponent).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'newid' })
      );
      const stateFn =
        mockDatasource.DimensionEditorComponent.mock.calls[
          mockDatasource.DimensionEditorComponent.mock.calls.length - 1
        ][0].setState;

      stateFn('newDatasourceState');
      expect(updateAll).not.toHaveBeenCalled();
      expect(updateDatasourceAsync).toHaveBeenCalled();
    });

    it('should update visualization if the datasource is complete', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      const updateAll = jest.fn();
      const updateDatasourceAsync = jest.fn();

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [{ ...defaultGroup, accessors: [] }],
      });

      renderLayerPanel({
        updateAll,
        updateDatasourceAsync,
      });

      await userEvent.click(screen.getByTestId('lns-empty-dimension'));
      expect(mockDatasource.DimensionEditorComponent).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'newid' })
      );
      const stateFn =
        mockDatasource.DimensionEditorComponent.mock.calls[
          mockDatasource.DimensionEditorComponent.mock.calls.length - 1
        ][0].setState;

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [{ ...defaultGroup, accessors: [] }],
      });
      act(() => {
        stateFn('newDatasourceState');
      });

      expect(updateAll).toHaveBeenCalled();
    });

    it('should remove the dimension when the datasource marks it as removed', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'columnId' }],
          },
        ],
      });
      const onRemoveDimension = jest.fn();
      renderLayerPanel({ onRemoveDimension, layerId: 'first' });
      await userEvent.click(screen.getByTestId('lnsLayerPanel-dimensionLink'));

      expect(mockDatasource.DimensionEditorComponent).toHaveBeenCalledWith(
        expect.objectContaining({ columnId: 'columnId' })
      );
      const stateFn =
        mockDatasource.DimensionEditorComponent.mock.calls[
          mockDatasource.DimensionEditorComponent.mock.calls.length - 1
        ][0].setState;

      act(() => {
        stateFn(
          {
            indexPatternId: '1',
            columns: {},
            columnOrder: [],
            incompleteColumns: { y: { operationType: 'average' } },
          },
          {
            isDimensionComplete: false,
          }
        );
      });
      expect(onRemoveDimension).toHaveBeenCalledWith({
        layerId: 'first',
        columnId: 'columnId',
      });
    });

    it('should keep the DimensionContainer open when configuring a new dimension', async () => {
      /**
       * The ID generation system for new dimensions has been messy before, so
       * this tests that the ID used in the first render is used to keep the container
       * open in future renders
       */
      (generateId as jest.Mock).mockReturnValue(`columnId`);
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'columnId' }],
          },
        ],
      });

      (generateId as jest.Mock).mockReturnValueOnce(`secondColumnId`);
      renderLayerPanel();
      await userEvent.click(screen.getAllByTestId('lns-empty-dimension')[0]);
      expect(screen.getByRole('heading', { name: defaultGroup.groupLabel })).toBeInTheDocument();

      const lastArgs =
        mockDatasource.DimensionEditorComponent.mock.calls[
          mockDatasource.DimensionEditorComponent.mock.calls.length - 1
        ][0];

      // Simulate what is called by the dimension editor
      act(() => {
        lastArgs.setState(lastArgs.state, {
          isDimensionComplete: true,
        });
      });
      expect(screen.getByRole('heading', { name: defaultGroup.groupLabel })).toBeInTheDocument();
    });

    it('should only update the state on close when needed', async () => {
      const updateDatasource = jest.fn();
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            supportsMoreColumns: false,
          },
        ],
      });

      // no pending state update
      mockDatasource.updateStateOnCloseDimension = jest.fn().mockReturnValueOnce(undefined);
      renderLayerPanel({ updateDatasource });
      await userEvent.click(screen.getAllByTestId('lnsLayerPanel-dimensionLink')[0]);
      await userEvent.click(screen.getByTestId('lns-indexPattern-dimensionContainerBack'));
      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).not.toHaveBeenCalled();

      // // a pending state update
      mockDatasource.updateStateOnCloseDimension = jest.fn().mockReturnValueOnce({ newState: {} });

      await userEvent.click(screen.getAllByTestId('lnsLayerPanel-dimensionLink')[0]);
      await userEvent.click(screen.getByTestId('lns-indexPattern-dimensionContainerBack'));

      expect(mockDatasource.updateStateOnCloseDimension).toHaveBeenCalled();
      expect(updateDatasource).toHaveBeenCalledWith('testDatasource', { newState: {} });
    });

    it('should display the fake final accessor if present in the group config', async () => {
      const fakeAccessorLabel = "I'm a fake!";
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            fakeFinalAccessor: {
              label: fakeAccessorLabel,
            },
            supportsMoreColumns: false,
          },
        ],
      });
      renderLayerPanel();
      expect(screen.getByTestId('lns-fakeDimension')).toHaveTextContent(fakeAccessorLabel);
    });

    it('should not display the fake final accessor if not present in the group config', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            fakeFinalAccessor: undefined,
            supportsMoreColumns: false,
          },
        ],
      });
      renderLayerPanel();
      expect(screen.queryByTestId('lns-fakeDimension')).not.toBeInTheDocument();
    });
  });

  describe('add a new dimension', () => {
    it('should call onEmptyDimensionAdd callback on new dimension creation', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [defaultGroup],
      });

      const onEmptyDimensionAdd = jest.fn();
      renderLayerPanel({ onEmptyDimensionAdd });
      await userEvent.click(screen.getAllByTestId('lns-empty-dimension')[0]);
      expect(onEmptyDimensionAdd).toHaveBeenCalledWith('newid', defaultGroup);
    });
  });

  describe('dimension trigger', () => {
    it('should render datasource dimension trigger if there is layer datasource', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [{ ...defaultGroup, accessors: [{ columnId: 'x' }] }],
      });

      mockVisualization.DimensionTriggerComponent = jest.fn();
      renderLayerPanel();
      expect(mockDatasource.DimensionTriggerComponent).toHaveBeenCalled();
      expect(mockVisualization.DimensionTriggerComponent).not.toHaveBeenCalled();
    });

    it('should render visualization dimension trigger if there is no layer datasource', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [{ ...defaultGroup, accessors: [{ columnId: 'x' }] }],
      });
      mockVisualization.DimensionTriggerComponent = jest.fn();

      renderLayerPanel({
        framePublicAPI: {
          ...props.framePublicAPI,
          datasourceLayers: {},
        },
      });
      expect(mockDatasource.DimensionTriggerComponent).not.toHaveBeenCalled();
      expect(mockVisualization.DimensionTriggerComponent).toHaveBeenCalled();
    });
  });
  // This test is more like an integration test, since the layer panel owns all
  // the coordination between drag and drop
  describe('drag and drop behavior', () => {
    it('should determine if the datasource supports dropping of a field onto empty dimension', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [defaultGroup],
      });

      mockDatasource.getDropProps.mockReturnValue({
        dropTypes: ['field_add'],
        nextLabel: '',
      });

      renderLayerPanel(
        undefined,
        undefined,
        createMockedDragDropContext({ dragging: draggingField })
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingField,
        })
      );
      const droppableElement = screen.getByTestId('lnsDragDrop-domDroppable');
      fireEvent.dragOver(droppableElement);
      fireEvent.drop(droppableElement);

      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingField,
        })
      );
    });

    it('should determine if the datasource supports dropping of a field onto a pre-filled dimension', async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
          },
        ],
      });

      mockDatasource.getDropProps.mockImplementation(({ target }) =>
        target.columnId !== 'a' ? { dropTypes: ['field_replace'], nextLabel: '' } : undefined
      );

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingField })}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      renderLayerPanel(
        undefined,
        undefined,
        createMockedDragDropContext({ dragging: draggingField })
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'a', layerId: 'first' }),
        })
      );

      expect(
        instance.find('[data-test-subj="lnsGroupTestId"] Droppable').first().prop('dropType')
      ).toEqual(undefined);

      const droppableElement = instance
        .find('[data-test-subj="lnsGroupTestId"] Droppable')
        .first()
        .find(DimensionButton)
        .first();

      droppableElement.simulate('dragOver');
      droppableElement.simulate('drop');

      expect(onDropToDimension).not.toHaveBeenCalled();
    });

    it('should allow drag to move between groups', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);

      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }],
            supportsMoreColumns: false,
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'b' }],
            dataTestSubj: 'lnsGroupTestId2',
          },
        ],
      });

      mockDatasource.getDropProps.mockReturnValue({
        dropTypes: ['replace_compatible'],
        nextLabel: '',
      });

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );

      expect(mockDatasource.getDropProps).toHaveBeenCalledWith(
        expect.objectContaining({
          source: draggingOperation,
        })
      );

      // Simulate drop on the pre-populated dimension

      const droppableElement = instance
        .find('[data-test-subj="lnsGroupTestId2"] Droppable .domDroppable')
        .at(0);
      droppableElement.simulate('dragOver');
      droppableElement.simulate('drop');

      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'b' }),
          source: draggingOperation,
        })
      );

      onDropToDimension.mockClear();

      // Simulate drop on the empty dimension

      const updatedDroppableElement = instance
        .find('[data-test-subj="lnsGroupTestId2"] Droppable .domDroppable')
        .last();

      updatedDroppableElement.simulate('dragOver');
      updatedDroppableElement.simulate('drop');

      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'newid' }),
          source: draggingOperation,
        })
      );
    });

    it('should reorder when dropping in the same group', async () => {
      jest.useFakeTimers();
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
        ],
      });

      const holder = document.createElement('div');
      document.body.appendChild(holder);

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>,
        undefined,
        { attachTo: holder }
      );
      act(() => {
        instance.find(Droppable).at(1).prop('onDrop')!(draggingOperation, 'reorder');
      });
      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'reorder',
          source: draggingOperation,
        })
      );
      const secondButton = instance
        .find(Draggable)
        .at(1)
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1)
        .instance();
      jest.runAllTimers();
      const focusedEl = document.activeElement;
      expect(focusedEl).toEqual(secondButton);
    });

    it('should copy when dropping on empty slot in the same group', async () => {
      (generateId as jest.Mock).mockReturnValue(`newid`);
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
        ],
      });

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(Droppable).at(2).prop('onDrop')!(draggingOperation, 'duplicate_compatible');
      });
      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ columnId: 'newid' }),
          dropType: 'duplicate_compatible',
          source: draggingOperation,
        })
      );
    });

    it('should call onDrop and update visualization when replacing between compatible groups', async () => {
      const mockVis = {
        ...mockVisualization,
        setDimension: jest.fn(() => 'modifiedState'),
      };
      mockVis.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'c' }],
          },
        ],
      });

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel {...getDefaultProps()} activeVisualization={mockVis} />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(Droppable).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });
      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
        })
      );
    });
    it('should call onDrop and update visualization when replacing between compatible groups2', async () => {
      const mockVis = {
        ...mockVisualization,
        setDimension: jest.fn(() => 'modifiedState'),
        onDrop: jest.fn(() => 'modifiedState'),
      };
      jest.spyOn(mockVis.onDrop, 'bind').mockImplementation((thisVal, ...args) => mockVis.onDrop);

      mockVis.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'c' }],
          },
        ],
      });

      mockDatasource.onDrop.mockReturnValue(true);
      const updateVisualization = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel
            {...getDefaultProps()}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(Droppable).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });

      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
          target: expect.objectContaining({
            columnId: 'c',
            groupId: 'b',
            id: 'c',
            layerId: 'first',
          }),
        })
      );
    });

    it('should not change visualization state if datasource drop failed', async () => {
      const mockVis = {
        ...mockVisualization,
        setDimension: jest.fn(() => 'modifiedState'),
      };

      mockVis.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'c' }],
          },
        ],
      });

      mockDatasource.onDrop.mockReturnValue(false);
      const updateVisualization = jest.fn();

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel
            {...getDefaultProps()}
            updateVisualization={updateVisualization}
            activeVisualization={mockVis}
          />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(Droppable).at(3).prop('onDrop')!(draggingOperation, 'replace_compatible');
      });

      expect(onDropToDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          dropType: 'replace_compatible',
          source: draggingOperation,
        })
      );
      expect(updateVisualization).not.toHaveBeenCalled();
    });

    it("should not remove source if drop type doesn't require it", async () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            ...defaultGroup,
            accessors: [{ columnId: 'a' }, { columnId: 'b' }],
          },
          {
            ...defaultGroup,
            groupLabel: 'B',
            groupId: 'b',
            accessors: [{ columnId: 'c' }],
          },
        ],
      });

      mockDatasource.onDrop.mockReturnValue(true);

      const { instance } = await mountWithProvider(
        <ChildDragDropProvider value={createMockedDragDropContext({ dragging: draggingOperation })}>
          <LayerPanel {...getDefaultProps()} />
        </ChildDragDropProvider>
      );
      act(() => {
        instance.find(Droppable).at(3).prop('onDrop')!(draggingOperation, 'duplicate_compatible');
      });
    });
  });
  // TODO - test user message display
});
