/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { EuiComboBox, EuiContextMenuItem, EuiSideNav } from '@elastic/eui';
import { IndexPatternPrivateState } from '../indexpattern';
import { changeColumn } from '../state_helpers';
import { getPotentialColumns, operationDefinitionMap } from '../operations';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { DropHandler, DragContextState } from '../../drag_drop';
import { createMockedDragDropContext } from '../mocks';

jest.mock('../state_helpers');
jest.mock('../operations');

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
};

describe('IndexPatternDimensionPanel', () => {
  let state: IndexPatternPrivateState;
  let dragDropContext: DragContextState;

  beforeEach(() => {
    state = {
      indexPatterns: expectedIndexPatterns,
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Date Histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          params: {
            interval: '1d',
          },
          sourceField: 'timestamp',
        },
      },
    };

    dragDropContext = createMockedDragDropContext();

    jest.clearAllMocks();
  });

  it('should display a configure button if dimension has no column yet', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="indexPattern-configure-dimension"]')
        .first()
        .text()
    ).toEqual('Configure dimension');
  });

  it('should pass the right arguments to getPotentialColumns', async () => {
    shallow(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    expect(getPotentialColumns as jest.Mock).toHaveBeenCalledWith(state, 1);
  });

  it('should call the filterOperations function', () => {
    const filterOperations = jest.fn().mockReturnValue(true);

    shallow(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={filterOperations}
      />
    );

    expect(filterOperations).toBeCalled();
  });

  it('should show field select combo box on click', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
  });

  it('should not show any choices if the filter returns false', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => false}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    expect(wrapper.find(EuiComboBox)!.prop('options')!).toHaveLength(0);
  });

  it('should list all field names and document as a whole in prioritized order', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={() => {}}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0].label).toEqual('Document');

    expect(options![1].options!.map(({ label }) => label)).toEqual([
      'timestamp',
      'bytes',
      'source',
    ]);
  });

  it('should indicate fields which are not valid for the field of the current column', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={{
          ...state,
          indexPatterns: {
            1: {
              ...state.indexPatterns[1],
              fields: [
                ...state.indexPatterns[1].fields,
                {
                  name: 'memory',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],
            },
          },
          columns: {
            ...state.columns,
            col1: {
              operationId: 'op1',
              label: 'Max of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'max',
              sourceField: 'bytes',
            },
          },
        }}
        setState={() => {}}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0].className).toContain('incompatible');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestamp')[0].className
    ).toContain('incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0].className
    ).not.toContain('incompatible');
  });

  it('should support selecting the operation before the field', () => {
    const setState = jest.fn();
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={{
          ...state,
          columns: {
            ...state.columns,
          },
        }}
        setState={setState}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    wrapper
      .find('[data-test-subj="lns-indexPatternDimension-min"]')
      .first()
      .prop('onClick')!({} as React.MouseEvent<{}, MouseEvent>);

    const comboBox = wrapper.find(EuiComboBox);
    const options = comboBox.prop('options');

    comboBox.prop('onChange')!([options![1].options![0]]);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col2: expect.objectContaining({
          sourceField: 'bytes',
          operationType: 'min',
          // Other parts of this don't matter for this test
        }),
      },
      columnOrder: ['col1', 'col2'],
    });
  });

  it('should indicate compatible fields when selecting the aggregation first', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={{
          ...state,
          columns: {
            ...state.columns,
          },
        }}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    wrapper
      .find('[data-test-subj="lns-indexPatternDimension-min"]')
      .first()
      .prop('onClick')!({} as React.MouseEvent<{}, MouseEvent>);

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0].className).toContain('incompatible');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestamp')[0].className
    ).toContain('incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'bytes')[0].className
    ).not.toContain('incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0].className
    ).not.toContain('incompatible');
  });

  it('should show all operation that are not filtered out', () => {
    const setState = jest.fn();

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={{
          ...state,
          columns: {
            ...state.columns,
            col1: {
              operationId: 'op1',
              label: 'Max of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'max',
              sourceField: 'bytes',
            },
          },
        }}
        setState={setState}
        columnId={'col1'}
        filterOperations={op => !op.isBucketed && op.dataType === 'number'}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    expect(
      wrapper
        .find(EuiSideNav)
        .prop('items')[0]
        .items.map(({ name }) => name)
    ).toEqual(['Minimum', 'Maximum', 'Average', 'Sum', 'Count']);
  });

  it('should update the datasource state on selection of an operation', () => {
    const setState = jest.fn();

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={{
          ...state,
          columns: {
            ...state.columns,
            col1: {
              operationId: 'op1',
              label: 'Max of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'max',
              sourceField: 'bytes',
            },
          },
        }}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    wrapper
      .find('[data-test-subj="lns-indexPatternDimension-min"]')
      .first()
      .prop('onClick')!({} as React.MouseEvent<{}, MouseEvent>);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col1: expect.objectContaining({
          operationType: 'min',
          sourceField: 'bytes',
          // Other parts of this don't matter for this test
        }),
      },
    });
  });

  it('should update the datasource state on selection of a field', () => {
    const setState = jest.fn();

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    const comboBox = wrapper.find(EuiComboBox)!;
    const option = comboBox.prop('options')![1].options![1];

    comboBox.prop('onChange')!([option]);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col1: expect.objectContaining({
          operationType: 'terms',
          sourceField: 'source',
          // Other parts of this don't matter for this test
        }),
      },
    });
  });

  it('should add a column on selection of a field', () => {
    const setState = jest.fn();

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={setState}
        columnId={'col2'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    const comboBox = wrapper.find(EuiComboBox)!;
    const option = comboBox.prop('options')![1].options![0];

    comboBox.prop('onChange')!([option]);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col2: expect.objectContaining({
          sourceField: 'bytes',
          // Other parts of this don't matter for this test
        }),
      },
      columnOrder: ['col1', 'col2'],
    });
  });

  it('should use helper function when changing the function', () => {
    const setState = jest.fn();

    const initialState: IndexPatternPrivateState = {
      ...state,
      columns: {
        ...state.columns,
        col1: {
          operationId: 'op1',
          label: 'Max of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'max',
          sourceField: 'bytes',
        },
      },
    };

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={initialState}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');

    wrapper
      .find('[data-test-subj="lns-indexPatternDimension-min"]')
      .first()
      .prop('onClick')!({} as React.MouseEvent<{}, MouseEvent>);

    expect(changeColumn).toHaveBeenCalledWith(
      initialState,
      'col1',
      expect.objectContaining({
        sourceField: 'bytes',
        operationType: 'min',
      })
    );
  });

  it('should clear the dimension with the clear button', () => {
    const setState = jest.fn();

    const wrapper = mount(
      <IndexPatternDimensionPanel
        dragDropContext={dragDropContext}
        state={state}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    const clearButton = wrapper.find(
      'EuiButtonIcon[data-test-subj="indexPattern-dimensionPopover-remove"]'
    );

    clearButton.simulate('click');

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {},
      columnOrder: [],
    });
  });

  describe('drag and drop', () => {
    function dragDropState() {
      return {
        ...state,
        currentIndexPatternId: 'foo',
        indexPatterns: {
          foo: {
            id: 'foo',
            title: 'Foo pattern',
            fields: [{ aggregatable: true, name: 'bar', searchable: true, type: 'number' }],
          },
        },
      };
    }

    it('is not droppable if no drag is happening', () => {
      const component = mount(
        <IndexPatternDimensionPanel
          dragDropContext={dragDropContext}
          state={dragDropState()}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={() => true}
        />
      );

      expect(
        component
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is not droppable if the dragged item has no type', () => {
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging: { name: 'bar' },
          }}
          state={dragDropState()}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={() => true}
        />
      );

      expect(
        component
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is not droppable if field is not supported by filterOperations', () => {
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging: { type: 'number', name: 'bar' },
          }}
          state={dragDropState()}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={() => false}
        />
      );

      expect(
        component
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is droppable if the field is supported by filterOperations', () => {
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging: { type: 'number', name: 'bar' },
          }}
          state={dragDropState()}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={op => op.dataType === 'number'}
        />
      );

      expect(
        component
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeTruthy();
    });

    it('appends the dropped column when a field is dropped', () => {
      const dragging = { type: 'number', name: 'bar' };
      const testState = dragDropState();
      const setState = jest.fn();
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          setState={setState}
          columnId={'col2'}
          filterOperations={op => op.dataType === 'number'}
        />
      );

      const onDrop = component
        .find('[data-test-subj="indexPattern-dropTarget"]')
        .first()
        .prop('onDrop') as DropHandler;

      onDrop(dragging);

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            ...testState.columns,
            col2: expect.objectContaining({
              dataType: 'number',
              sourceField: 'bar',
            }),
          }),
        })
      );
    });

    it('updates a column when a field is dropped', () => {
      const dragging = { type: 'number', name: 'bar' };
      const testState = dragDropState();
      const setState = jest.fn();
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          setState={setState}
          columnId={'col1'}
          filterOperations={op => op.dataType === 'number'}
        />
      );

      const onDrop = component
        .find('[data-test-subj="indexPattern-dropTarget"]')
        .first()
        .prop('onDrop') as DropHandler;

      onDrop(dragging);

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.objectContaining({
            col1: expect.objectContaining({
              dataType: 'number',
              sourceField: 'bar',
            }),
          }),
        })
      );
    });

    it('ignores drops of unsupported fields', () => {
      const dragging = { type: 'number', name: 'baz' };
      const testState = dragDropState();
      const setState = jest.fn();
      const component = shallow(
        <IndexPatternDimensionPanel
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          setState={setState}
          columnId={'col2'}
          filterOperations={op => op.dataType === 'number'}
        />
      );

      const onDrop = component
        .find('[data-test-subj="indexPattern-dropTarget"]')
        .first()
        .prop('onDrop') as DropHandler;

      onDrop(dragging);

      expect(setState).not.toBeCalled();
    });
  });
});
