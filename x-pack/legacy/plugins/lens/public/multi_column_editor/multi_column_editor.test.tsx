/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMockDatasource } from '../editor_frame_plugin/mocks';
import { MultiColumnEditor } from './multi_column_editor';
import { mount } from 'enzyme';

jest.useFakeTimers();

describe('MultiColumnEditor', () => {
  it('should add a trailing accessor if the accessor list is empty', () => {
    const onAdd = jest.fn();
    mount(
      <MultiColumnEditor
        accessors={[]}
        datasource={createMockDatasource().publicAPIMock}
        dragDropContext={{ dragging: undefined, setDragging: jest.fn() }}
        filterOperations={() => true}
        layerId="foo"
        onAdd={onAdd}
        onRemove={jest.fn()}
        testSubj="bar"
      />
    );

    expect(onAdd).toHaveBeenCalledTimes(0);

    jest.runAllTimers();

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('should add a trailing accessor if the last accessor is configured', () => {
    const onAdd = jest.fn();
    mount(
      <MultiColumnEditor
        accessors={['baz']}
        datasource={{
          ...createMockDatasource().publicAPIMock,
          getOperationForColumnId(id) {
            if (id !== 'baz') {
              throw new Error(`Unexpected id: ${id}`);
            }
            return {
              dataType: 'number',
              id,
              isBucketed: true,
              label: 'BaaaZZZ!',
            };
          },
        }}
        dragDropContext={{ dragging: undefined, setDragging: jest.fn() }}
        filterOperations={() => true}
        layerId="foo"
        onAdd={onAdd}
        onRemove={jest.fn()}
        testSubj="bar"
      />
    );

    expect(onAdd).toHaveBeenCalledTimes(0);

    jest.runAllTimers();

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
