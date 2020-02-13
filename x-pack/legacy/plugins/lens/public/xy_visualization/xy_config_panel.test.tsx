/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { EuiButtonGroupProps } from '@elastic/eui';
import { XYConfigPanel, LayerContextMenu } from './xy_config_panel';
import { DatasourceDimensionPanelProps, Operation, FramePublicAPI } from '../types';
import { State } from './types';
import { Position } from '@elastic/charts';
import { NativeRendererProps } from '../native_renderer';
import { generateId } from '../id_generator';
import { createMockFramePublicAPI, createMockDatasource } from '../editor_frame_service/mocks';

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

  describe('LayerContextMenu', () => {
    test('enables stacked chart types even when there is no split series', () => {
      const state = testState();
      const component = mount(
        <LayerContextMenu
          layerId={state.layers[0].layerId}
          dragDropContext={dragDropContext}
          frame={frame}
          setState={jest.fn()}
          state={{ ...state, layers: [{ ...state.layers[0], xAccessor: 'shazm' }] }}
        />
      );

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
        <LayerContextMenu
          layerId={state.layers[0].layerId}
          dragDropContext={dragDropContext}
          frame={frame}
          setState={jest.fn()}
          state={{ ...state, layers: [{ ...state.layers[0], seriesType: 'bar_horizontal' }] }}
        />
      );

      const options = component
        .find('[data-test-subj="lnsXY_seriesType"]')
        .first()
        .prop('options') as EuiButtonGroupProps['options'];

      expect(options!.map(({ id }) => id)).toEqual(['bar_horizontal', 'bar_horizontal_stacked']);
      expect(options!.filter(({ isDisabled }) => isDisabled).map(({ id }) => id)).toEqual([]);
    });
  });

  test('the x dimension panel accepts only bucketed operations', () => {
    // TODO: this should eventually also accept raw operation
    const state = testState();
    const component = mount(
      <XYConfigPanel
        layerId={state.layers[0].layerId}
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
        layerId={state.layers[0].layerId}
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
        layerId={state.layers[0].layerId}
        dragDropContext={dragDropContext}
        frame={frame}
        setState={setState}
        state={{ ...state, layers: [{ ...state.layers[0], accessors: ['a', 'b', 'c'] }] }}
      />
    );

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
        layerId={state.layers[0].layerId}
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
});
