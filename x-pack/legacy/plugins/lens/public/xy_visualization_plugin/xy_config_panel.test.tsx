/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FormEvent } from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { EuiButtonGroupProps } from '@elastic/eui';
import { XYConfigPanel } from './xy_config_panel';
import { DatasourceDimensionPanelProps, Operation, FramePublicAPI } from '../types';
import { State, XYState } from './types';
import { Position } from '@elastic/charts';
import { NativeRendererProps } from '../native_renderer';
import { generateId } from '../id_generator';
import { createMockFramePublicAPI, createMockDatasource } from '../editor_frame_plugin/mocks';
import { act } from 'react-test-renderer';

jest.mock('../id_generator');

describe('XYConfigPanel', () => {
  const dragDropContext = { dragging: undefined, setDragging: jest.fn() };

  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
    };
  }

  function testSubj(component: ReactWrapper<unknown>, subj: string) {
    return component
      .find(`[data-test-subj="${subj}"]`)
      .first()
      .props();
  }

  function openComponentPopover(component: ReactWrapper<unknown>, layerId: string) {
    component
      .find(`[data-test-subj="lnsXY_layer_${layerId}"]`)
      .first()
      .find(`[data-test-subj="lnsXY_layer_advanced"]`)
      .first()
      .simulate('click');
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource().publicAPIMock,
    };
  });

  test.skip('allows toggling of legend visibility', () => {});
  test.skip('allows changing legend position', () => {});
  test.skip('allows toggling the y axis gridlines', () => {});
  test.skip('allows toggling the x axis gridlines', () => {});

  test('enables stacked chart types even when there is no split series', () => {
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={jest.fn()}
        state={{ ...state, layers: [{ ...state.layers[0], xAccessor: 'shazm' }] }}
      />
    );

    openComponentPopover(component, 'first');

    const options = component
      .find('[data-test-subj="lnsXY_seriesType"]')
      .first()
      .prop('options') as EuiButtonGroupProps['options'];

    expect(options!.map(({ id }) => id)).toEqual([
      'bar',
      'bar_stacked',
      'line',
      'area',
      'area_stacked',
    ]);

    expect(options!.filter(({ isDisabled }) => isDisabled).map(({ id }) => id)).toEqual([]);
  });

  test('shows only horizontal bar options when in horizontal mode', () => {
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={jest.fn()}
        state={{ ...state, layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }] }}
      />
    );

    openComponentPopover(component, 'first');

    const options = component
      .find('[data-test-subj="lnsXY_seriesType"]')
      .first()
      .prop('options') as EuiButtonGroupProps['options'];

    expect(options!.map(({ id }) => id)).toEqual(['bar_horizontal', 'bar_horizontal_stacked']);
    expect(options!.filter(({ isDisabled }) => isDisabled).map(({ id }) => id)).toEqual([]);
  });

  test('the x dimension panel accepts only bucketed operations', () => {
    // TODO: this should eventually also accept raw operation
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={jest.fn()}
        state={{ ...state, layers: [{ ...state.layers[0], xAccessor: 'shazm' }] }}
      />
    );

    const panel = testSubj(component, 'lnsXY_xDimensionPanel');
    const nativeProps = (panel as NativeRendererProps<DatasourceDimensionPanelProps>).nativeProps;
    const { columnId, filterOperations } = nativeProps;
    const exampleOperation: Operation = {
      dataType: 'number',
      isBucketed: false,
      label: 'bar',
    };
    const bucketedOps: Operation[] = [
      { ...exampleOperation, isBucketed: true, dataType: 'number' },
      { ...exampleOperation, isBucketed: true, dataType: 'string' },
      { ...exampleOperation, isBucketed: true, dataType: 'boolean' },
      { ...exampleOperation, isBucketed: true, dataType: 'date' },
    ];
    const ops: Operation[] = [
      ...bucketedOps,
      { ...exampleOperation, dataType: 'number' },
      { ...exampleOperation, dataType: 'string' },
      { ...exampleOperation, dataType: 'boolean' },
      { ...exampleOperation, dataType: 'date' },
    ];
    expect(columnId).toEqual('shazm');
    expect(ops.filter(filterOperations)).toEqual(bucketedOps);
  });

  test('the y dimension panel accepts numeric operations', () => {
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={jest.fn()}
        state={{ ...state, layers: [{ ...state.layers[0], accessors: ['a', 'b', 'c'] }] }}
      />
    );

    const filterOperations = component
      .find('[data-test-subj="lensXY_yDimensionPanel"]')
      .first()
      .prop('filterOperations') as (op: Operation) => boolean;

    const exampleOperation: Operation = {
      dataType: 'number',
      isBucketed: false,
      label: 'bar',
    };
    const ops: Operation[] = [
      { ...exampleOperation, dataType: 'number' },
      { ...exampleOperation, dataType: 'string' },
      { ...exampleOperation, dataType: 'boolean' },
      { ...exampleOperation, dataType: 'date' },
    ];
    expect(ops.filter(filterOperations).map(x => x.dataType)).toEqual(['number']);
  });

  test('allows removal of y dimensions', () => {
    const setState = jest.fn();
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={setState}
        state={{ ...state, layers: [{ ...state.layers[0], accessors: ['a', 'b', 'c'] }] }}
      />
    );

    openComponentPopover(component, 'first');

    const onRemove = component
      .find('[data-test-subj="lensXY_yDimensionPanel"]')
      .first()
      .prop('onRemove') as (accessor: string) => {};

    onRemove('b');

    expect(setState).toHaveBeenCalledTimes(1);
    expect(setState.mock.calls[0][0]).toMatchObject({
      layers: [
        {
          ...state.layers[0],
          accessors: ['a', 'c'],
        },
      ],
    });
  });

  test('allows adding a y axis dimension', () => {
    (generateId as jest.Mock).mockReturnValueOnce('zed');
    const setState = jest.fn();
    const state = testState();
    const component = mount(
      <XYConfigPanel
        dragDropContext={dragDropContext}
        frame={frame}
        setState={setState}
        state={{ ...state, layers: [{ ...state.layers[0], accessors: ['a', 'b', 'c'] }] }}
      />
    );

    const onAdd = component
      .find('[data-test-subj="lensXY_yDimensionPanel"]')
      .first()
      .prop('onAdd') as () => {};

    onAdd();

    expect(setState).toHaveBeenCalledTimes(1);
    expect(setState.mock.calls[0][0]).toMatchObject({
      layers: [
        {
          ...state.layers[0],
          accessors: ['a', 'b', 'c', 'zed'],
        },
      ],
    });
  });

  describe('layers', () => {
    it('adds layers', () => {
      frame.addNewLayer = jest.fn().mockReturnValue('newLayerId');
      (generateId as jest.Mock).mockReturnValue('accessor');
      const setState = jest.fn();
      const state = testState();
      const component = mount(
        <XYConfigPanel
          dragDropContext={dragDropContext}
          frame={frame}
          setState={setState}
          state={state}
        />
      );

      component
        .find('[data-test-subj="lnsXY_layer_add"]')
        .first()
        .simulate('click');

      expect(frame.addNewLayer).toHaveBeenCalled();
      expect(setState).toHaveBeenCalledTimes(1);
      expect(generateId).toHaveBeenCalledTimes(4);
      expect(setState.mock.calls[0][0]).toMatchObject({
        layers: [
          ...state.layers,
          expect.objectContaining({
            layerId: 'newLayerId',
            xAccessor: 'accessor',
            accessors: ['accessor'],
            splitAccessor: 'accessor',
          }),
        ],
      });
    });

    it('should use series type of existing layers if they all have the same', () => {
      frame.addNewLayer = jest.fn().mockReturnValue('newLayerId');
      frame.datasourceLayers.second = createMockDatasource().publicAPIMock;
      (generateId as jest.Mock).mockReturnValue('accessor');
      const setState = jest.fn();
      const state: XYState = {
        ...testState(),
        preferredSeriesType: 'bar',
        layers: [
          {
            seriesType: 'line',
            layerId: 'first',
            splitAccessor: 'baz',
            xAccessor: 'foo',
            accessors: ['bar'],
          },
          {
            seriesType: 'line',
            layerId: 'second',
            splitAccessor: 'baz',
            xAccessor: 'foo',
            accessors: ['bar'],
          },
        ],
      };
      const component = mount(
        <XYConfigPanel
          dragDropContext={dragDropContext}
          frame={frame}
          setState={setState}
          state={state}
        />
      );

      component
        .find('[data-test-subj="lnsXY_layer_add"]')
        .first()
        .simulate('click');

      expect(setState.mock.calls[0][0]).toMatchObject({
        layers: [
          ...state.layers,
          expect.objectContaining({
            seriesType: 'line',
          }),
        ],
      });
    });

    it('should use preffered series type if there are already various different layers', () => {
      frame.addNewLayer = jest.fn().mockReturnValue('newLayerId');
      frame.datasourceLayers.second = createMockDatasource().publicAPIMock;
      (generateId as jest.Mock).mockReturnValue('accessor');
      const setState = jest.fn();
      const state: XYState = {
        ...testState(),
        preferredSeriesType: 'bar',
        layers: [
          {
            seriesType: 'area',
            layerId: 'first',
            splitAccessor: 'baz',
            xAccessor: 'foo',
            accessors: ['bar'],
          },
          {
            seriesType: 'line',
            layerId: 'second',
            splitAccessor: 'baz',
            xAccessor: 'foo',
            accessors: ['bar'],
          },
        ],
      };
      const component = mount(
        <XYConfigPanel
          dragDropContext={dragDropContext}
          frame={frame}
          setState={setState}
          state={state}
        />
      );

      component
        .find('[data-test-subj="lnsXY_layer_add"]')
        .first()
        .simulate('click');

      expect(setState.mock.calls[0][0]).toMatchObject({
        layers: [
          ...state.layers,
          expect.objectContaining({
            seriesType: 'bar',
          }),
        ],
      });
    });

    it('removes layers', () => {
      const setState = jest.fn();
      const state = testState();
      const component = mount(
        <XYConfigPanel
          dragDropContext={dragDropContext}
          frame={frame}
          setState={setState}
          state={state}
        />
      );

      openComponentPopover(component, 'first');

      component
        .find('[data-test-subj="lnsXY_layer_remove"]')
        .first()
        .simulate('click');

      expect(frame.removeLayers).toHaveBeenCalled();
      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0]).toMatchObject({
        layers: [],
      });
    });
  });
});
