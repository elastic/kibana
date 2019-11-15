/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMockDatasource } from '../editor_frame_plugin/mocks';
import { MultiColumnEditor } from './multi_column_editor';
import { mount } from 'enzyme';

describe('MultiColumnEditor', () => {
  it('should not call onAdd if an existing dimension is edited', () => {
    const onAdd = jest.fn();
    const component = mount(
      <MultiColumnEditor
        accessors={['foo']}
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

    const onCreate = component
      .find('[data-test-subj="lns_multi_column_bar_foo"]')
      .first()
      .prop('onCreate');
    (onCreate as () => {})();

    expect(onAdd).toHaveBeenCalledTimes(0);
  });

  it('should add a trailing accessor if the last accessor is configured', () => {
    const onAdd = jest.fn();
    const component = mount(
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

    const onCreate = component
      .find('[data-test-subj="lns_multi_column_add_bar"]')
      .first()
      .prop('onCreate');
    (onCreate as (s: string) => {})('hi');

    expect(onAdd).toHaveBeenCalledWith('hi');
  });
});
