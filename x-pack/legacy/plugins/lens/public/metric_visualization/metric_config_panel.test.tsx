/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { MetricConfigPanel } from './metric_config_panel';
import { DatasourceDimensionPanelProps, Operation, DatasourcePublicAPI } from '../types';
import { State } from './types';
import { NativeRendererProps } from '../native_renderer';
import { createMockFramePublicAPI, createMockDatasource } from '../editor_frame_service/mocks';

describe('MetricConfigPanel', () => {
  const dragDropContext = { dragging: undefined, setDragging: jest.fn() };

  function mockDatasource(): DatasourcePublicAPI {
    return createMockDatasource().publicAPIMock;
  }

  function testState(): State {
    return {
      accessor: 'foo',
      layerId: 'bar',
    };
  }

  function testSubj(component: ReactWrapper<unknown>, subj: string) {
    return component
      .find(`[data-test-subj="${subj}"]`)
      .first()
      .props();
  }

  test('the value dimension panel only accepts singular numeric operations', () => {
    const state = testState();
    const component = mount(
      <MetricConfigPanel
        layerId="bar"
        dragDropContext={dragDropContext}
        setState={jest.fn()}
        frame={{
          ...createMockFramePublicAPI(),
          datasourceLayers: { bar: mockDatasource() },
        }}
        state={{ ...state, accessor: 'shazm' }}
      />
    );

    const panel = testSubj(component, 'lns_metric_valueDimensionPanel');
    const nativeProps = (panel as NativeRendererProps<DatasourceDimensionPanelProps>).nativeProps;
    const { columnId, filterOperations } = nativeProps;
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
    expect(columnId).toEqual('shazm');
    expect(ops.filter(filterOperations)).toEqual([{ ...exampleOperation, dataType: 'number' }]);
  });
});
