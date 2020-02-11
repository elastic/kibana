/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper, ShallowWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiComboBox, EuiSideNav, EuiSideNavItemType, EuiPopover } from '@elastic/eui';
import { changeColumn } from '../state_helpers';
import {
  IndexPatternDimensionPanel,
  IndexPatternDimensionPanelComponent,
  IndexPatternDimensionPanelProps,
} from './dimension_panel';
import { DropHandler, DragContextState } from '../../drag_drop';
import { createMockedDragDropContext } from '../mocks';
import { mountWithIntl as mount, shallowWithIntl as shallow } from 'test_utils/enzyme_helpers';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IndexPatternPrivateState } from '../types';
import { documentField } from '../document_field';

jest.mock('ui/new_platform');
jest.mock('../loader');
jest.mock('../state_helpers');

// Used by indexpattern plugin, which is a dependency of a dependency
jest.mock('ui/chrome');
// Contains old and new platform data plugins, used for interpreter and filter ratio
jest.mock('ui/new_platform');
jest.mock('plugins/data/setup', () => ({ data: { query: { ui: {} } } }));

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasExistence: true,
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
        exists: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
        exists: true,
      },
      {
        name: 'memory',
        type: 'number',
        aggregatable: true,
        searchable: true,
        exists: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
        exists: true,
      },
      documentField,
    ],
  },
};

describe('IndexPatternDimensionPanel', () => {
  let wrapper: ReactWrapper | ShallowWrapper;
  let state: IndexPatternPrivateState;
  let setState: jest.Mock;
  let defaultProps: IndexPatternDimensionPanelProps;
  let dragDropContext: DragContextState;

  function openPopover() {
    wrapper
      .find('[data-test-subj="indexPattern-configure-dimension"]')
      .first()
      .simulate('click');
  }

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      indexPatterns: expectedIndexPatterns,
      currentIndexPatternId: '1',
      showEmptyFields: false,
      existingFields: {
        'my-fake-index-pattern': {
          timestamp: true,
          bytes: true,
          memory: true,
          source: true,
        },
      },
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Date histogram of timestamp',
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
        },
      },
    };

    setState = jest.fn();

    dragDropContext = createMockedDragDropContext();

    defaultProps = {
      dragDropContext,
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      uniqueLabel: 'stuff',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('should display a configure button if dimension has no column yet', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);
    expect(
      wrapper
        .find('[data-test-subj="indexPattern-configure-dimension"]')
        .first()
        .prop('iconType')
    ).toEqual('plusInCircleFilled');
  });

  it('should call the filterOperations function', () => {
    const filterOperations = jest.fn().mockReturnValue(true);

    wrapper = shallow(
      <IndexPatternDimensionPanelComponent {...defaultProps} filterOperations={filterOperations} />
    );

    expect(filterOperations).toBeCalled();
  });

  it('should show field select combo box on click', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
  });

  it('should not show any choices if the filter returns false', () => {
    wrapper = mount(
      <IndexPatternDimensionPanel
        {...defaultProps}
        columnId={'col2'}
        filterOperations={() => false}
      />
    );

    openPopover();

    expect(wrapper.find(EuiComboBox)!.prop('options')!).toHaveLength(0);
  });

  it('should list all field names and document as a whole in prioritized order', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options).toHaveLength(2);

    expect(options![0].label).toEqual('Records');

    expect(options![1].options!.map(({ label }) => label)).toEqual([
      'timestamp',
      'bytes',
      'memory',
      'source',
    ]);
  });

  it('should hide fields that have no data', () => {
    const props = {
      ...defaultProps,
      state: {
        ...defaultProps.state,
        existingFields: {
          'my-fake-index-pattern': {
            timestamp: true,
            source: true,
          },
        },
      },
    };
    wrapper = mount(<IndexPatternDimensionPanel {...props} />);

    openPopover();

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![1].options!.map(({ label }) => label)).toEqual(['timestamp', 'source']);
  });

  it('should indicate fields which are incompatible for the operation of the current column', () => {
    wrapper = mount(
      <IndexPatternDimensionPanel
        {...defaultProps}
        state={{
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columns: {
                ...state.layers.first.columns,
                col1: {
                  label: 'Max of bytes',
                  dataType: 'number',
                  isBucketed: false,

                  // Private
                  operationType: 'max',
                  sourceField: 'bytes',
                },
              },
            },
          },
        }}
      />
    );

    openPopover();

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0]['data-test-subj']).toEqual('lns-fieldOptionIncompatible-Records');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestamp')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate operations which are incompatible for the field of the current column', () => {
    wrapper = mount(
      <IndexPatternDimensionPanel
        {...defaultProps}
        state={{
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columns: {
                ...state.layers.first.columns,
                col1: {
                  label: 'Max of bytes',
                  dataType: 'number',
                  isBucketed: false,

                  // Private
                  operationType: 'max',
                  sourceField: 'bytes',
                },
              },
            },
          },
        }}
      />
    );

    openPopover();

    interface ItemType {
      name: string;
      'data-test-subj': string;
    }
    const items: Array<EuiSideNavItemType<ItemType>> = wrapper.find(EuiSideNav).prop('items');
    const options = (items[0].items as unknown) as ItemType[];

    expect(options.find(({ name }) => name === 'Minimum')!['data-test-subj']).not.toContain(
      'Incompatible'
    );

    expect(options.find(({ name }) => name === 'Date histogram')!['data-test-subj']).toContain(
      'Incompatible'
    );
  });

  it('should keep the operation when switching to another field compatible with this operation', () => {
    const initialState: IndexPatternPrivateState = {
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: {
              label: 'Max of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'max',
              sourceField: 'bytes',
            },
          },
        },
      },
    };

    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} state={initialState} />);

    openPopover();

    const comboBox = wrapper.find(EuiComboBox)!;
    const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'memory')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState).toHaveBeenCalledWith({
      ...initialState,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'max',
              sourceField: 'memory',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should switch operations when selecting a field that requires another operation', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    const comboBox = wrapper.find(EuiComboBox)!;
    const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'source')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'terms',
              sourceField: 'source',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should keep the field when switching to another operation compatible for this field', () => {
    wrapper = mount(
      <IndexPatternDimensionPanel
        {...defaultProps}
        state={{
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columns: {
                ...state.layers.first.columns,
                col1: {
                  label: 'Max of bytes',
                  dataType: 'number',
                  isBucketed: false,

                  // Private
                  operationType: 'max',
                  sourceField: 'bytes',
                },
              },
            },
          },
        }}
      />
    );

    openPopover();

    act(() => {
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-min"]').simulate('click');
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'min',
              sourceField: 'bytes',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should not set the state if selecting the currently active operation', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    act(() => {
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-date_histogram"]')
        .simulate('click');
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('should update label on label input changes', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    act(() => {
      wrapper
        .find('input[data-test-subj="indexPattern-label-edit"]')
        .simulate('change', { target: { value: 'New Label' } });
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'New Label',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  describe('transient invalid state', () => {
    it('should not set the state if selecting an operation incompatible with the current field', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      act(() => {
        wrapper
          .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
          .simulate('click');
      });

      expect(setState).not.toHaveBeenCalled();
    });

    it('should show error message in invalid state', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
        .simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).not.toHaveLength(0);

      expect(setState).not.toHaveBeenCalled();
    });

    it('should leave error state if a compatible operation is selected', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
        .simulate('click');

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-date_histogram"]')
        .simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should leave error state if the popover gets closed', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
        .simulate('click');

      act(() => {
        wrapper.find(EuiPopover).prop('closePopover')!();
      });

      openPopover();

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should indicate fields compatible with selected operation', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
        .simulate('click');

      const options = wrapper.find(EuiComboBox).prop('options');

      expect(options![0]['data-test-subj']).toContain('Incompatible');

      expect(
        options![1].options!.filter(({ label }) => label === 'timestamp')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should select compatible operation if field not compatible with selected operation', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);

      openPopover();

      wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

      const comboBox = wrapper.find(EuiComboBox);
      const options = comboBox.prop('options');

      // options[1][2] is a `source` field of type `string` which doesn't support `avg` operation
      act(() => {
        comboBox.prop('onChange')!([options![1].options![2]]);
      });

      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
                // Other parts of this don't matter for this test
              }),
            },
            columnOrder: ['col1', 'col2'],
          },
        },
      });
    });

    it('should select the Records field when count is selected', () => {
      const initialState: IndexPatternPrivateState = {
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: '',
                operationType: 'avg',
                sourceField: 'bytes',
              },
            },
          },
        },
      };
      wrapper = mount(
        <IndexPatternDimensionPanel {...defaultProps} state={initialState} columnId="col2" />
      );

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-count"]')
        .simulate('click');

      const newColumnState = setState.mock.calls[0][0].layers.first.columns.col2;
      expect(newColumnState.operationType).toEqual('count');
      expect(newColumnState.sourceField).toEqual('Records');
    });

    it('should indicate document and field compatibility with selected document operation', () => {
      const initialState: IndexPatternPrivateState = {
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: '',
                operationType: 'count',
                sourceField: 'Records',
              },
            },
          },
        },
      };
      wrapper = mount(
        <IndexPatternDimensionPanel {...defaultProps} state={initialState} columnId="col2" />
      );

      openPopover();

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
        .simulate('click');

      const options = wrapper.find(EuiComboBox).prop('options');

      expect(options![0]['data-test-subj']).toContain('Incompatible');

      expect(
        options![1].options!.filter(({ label }) => label === 'timestamp')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should set datasource state if compatible field is selected for operation', () => {
      wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

      openPopover();

      act(() => {
        wrapper
          .find('button[data-test-subj="lns-indexPatternDimensionIncompatible-terms"]')
          .simulate('click');
      });

      const comboBox = wrapper.find(EuiComboBox)!;
      const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'source')!;

      act(() => {
        comboBox.prop('onChange')!([option]);
      });

      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
              }),
            },
          },
        },
      });
    });
  });

  it('should support selecting the operation before the field', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);

    openPopover();

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

    const comboBox = wrapper.find(EuiComboBox);
    const options = comboBox.prop('options');

    act(() => {
      comboBox.prop('onChange')!([options![1].options![0]]);
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              sourceField: 'bytes',
              operationType: 'avg',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should select operation directly if only one field is possible', () => {
    const initialState = {
      ...state,
      indexPatterns: {
        1: {
          ...state.indexPatterns['1'],
          fields: state.indexPatterns['1'].fields.filter(field => field.name !== 'memory'),
        },
      },
    };

    wrapper = mount(
      <IndexPatternDimensionPanel {...defaultProps} state={initialState} columnId={'col2'} />
    );

    openPopover();

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

    expect(setState).toHaveBeenCalledWith({
      ...initialState,
      layers: {
        first: {
          ...initialState.layers.first,
          columns: {
            ...initialState.layers.first.columns,
            col2: expect.objectContaining({
              sourceField: 'bytes',
              operationType: 'avg',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should select operation directly if only document is possible', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);

    openPopover();

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-count"]').simulate('click');

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'count',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should indicate compatible fields when selecting the operation first', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);

    openPopover();

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0]['data-test-subj']).toContain('Incompatible');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestamp')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'bytes')[0]['data-test-subj']
    ).not.toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate document compatibility when document operation is selected', () => {
    const initialState: IndexPatternPrivateState = {
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'count',
              sourceField: 'Records',
            },
          },
        },
      },
    };
    wrapper = mount(
      <IndexPatternDimensionPanel {...defaultProps} state={initialState} columnId={'col2'} />
    );

    openPopover();

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options![0]['data-test-subj']).not.toContain('Incompatible');

    options![1].options!.map(operation =>
      expect(operation['data-test-subj']).toContain('Incompatible')
    );
  });

  it('should show all operations that are not filtered out', () => {
    wrapper = mount(
      <IndexPatternDimensionPanel
        {...defaultProps}
        filterOperations={op => !op.isBucketed && op.dataType === 'number'}
      />
    );

    openPopover();

    interface ItemType {
      name: React.ReactNode;
    }
    const items: Array<EuiSideNavItemType<ItemType>> = wrapper.find(EuiSideNav).prop('items');
    const options = (items[0].items as unknown) as ItemType[];

    expect(options.map(({ name }: { name: React.ReactNode }) => name)).toEqual([
      'Unique count',
      'Average',
      'Count',
      'Maximum',
      'Minimum',
      'Sum',
    ]);
  });

  it('should add a column on selection of a field', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} columnId={'col2'} />);

    openPopover();

    const comboBox = wrapper.find(EuiComboBox)!;
    const option = comboBox.prop('options')![1].options![0];

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              sourceField: 'bytes',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should use helper function when changing the function', () => {
    const initialState: IndexPatternPrivateState = {
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: {
              label: 'Max of bytes',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'max',
              sourceField: 'bytes',
            },
          },
        },
      },
    };
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} state={initialState} />);

    openPopover();

    act(() => {
      wrapper
        .find('[data-test-subj="lns-indexPatternDimension-min"]')
        .first()
        .prop('onClick')!({} as React.MouseEvent<{}, MouseEvent>);
    });

    expect(changeColumn).toHaveBeenCalledWith({
      state: initialState,
      columnId: 'col1',
      layerId: 'first',
      newColumn: expect.objectContaining({
        sourceField: 'bytes',
        operationType: 'min',
      }),
    });
  });

  it('should clear the dimension with the clear button', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    const clearButton = wrapper.find(
      'EuiButtonIcon[data-test-subj="indexPattern-dimensionPopover-remove"]'
    );

    act(() => {
      clearButton.simulate('click');
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          indexPatternId: '1',
          columns: {},
          columnOrder: [],
        },
      },
    });
  });

  it('should clear the dimension when removing the selection in field combobox', () => {
    wrapper = mount(<IndexPatternDimensionPanel {...defaultProps} />);

    openPopover();

    act(() => {
      wrapper.find(EuiComboBox).prop('onChange')!([]);
    });

    expect(setState).toHaveBeenCalledWith({
      ...state,
      layers: {
        first: {
          indexPatternId: '1',
          columns: {},
          columnOrder: [],
        },
      },
    });
  });

  describe('drag and drop', () => {
    function dragDropState(): IndexPatternPrivateState {
      return {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          foo: {
            id: 'foo',
            title: 'Foo pattern',
            fields: [
              {
                aggregatable: true,
                name: 'bar',
                searchable: true,
                type: 'number',
              },
              {
                aggregatable: true,
                name: 'mystring',
                searchable: true,
                type: 'string',
              },
            ],
          },
        },
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          myLayer: {
            indexPatternId: 'foo',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'Date histogram of timestamp',
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
          },
        },
      };
    }

    it('is not droppable if no drag is happening', () => {
      wrapper = mount(
        <IndexPatternDimensionPanel {...defaultProps} state={dragDropState()} layerId="myLayer" />
      );

      expect(
        wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is not droppable if the dragged item has no field', () => {
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging: { name: 'bar' },
          }}
          state={dragDropState()}
          layerId="myLayer"
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is not droppable if field is not supported by filterOperations', () => {
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging: {
              indexPatternId: 'foo',
              field: { type: 'string', name: 'mystring', aggregatable: true },
            },
          }}
          state={dragDropState()}
          filterOperations={() => false}
          layerId="myLayer"
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('is droppable if the field is supported by filterOperations', () => {
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging: {
              field: { type: 'number', name: 'bar', aggregatable: true },
              indexPatternId: 'foo',
            },
          }}
          state={dragDropState()}
          filterOperations={op => op.dataType === 'number'}
          layerId="myLayer"
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeTruthy();
    });

    it('is notdroppable if the field belongs to another index pattern', () => {
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging: {
              field: { type: 'number', name: 'bar', aggregatable: true },
              indexPatternId: 'foo2',
            },
          }}
          state={dragDropState()}
          filterOperations={op => op.dataType === 'number'}
          layerId="myLayer"
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('droppable')
      ).toBeFalsy();
    });

    it('appends the dropped column when a field is dropped', () => {
      const dragging = {
        field: { type: 'number', name: 'bar', aggregatable: true },
        indexPatternId: 'foo',
      };
      const testState = dragDropState();
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          columnId={'col2'}
          filterOperations={op => op.dataType === 'number'}
          layerId="myLayer"
        />
      );

      act(() => {
        const onDrop = wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('onDrop') as DropHandler;

        onDrop(dragging);
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          myLayer: {
            ...testState.layers.myLayer,
            columnOrder: ['col1', 'col2'],
            columns: {
              ...testState.layers.myLayer.columns,
              col2: expect.objectContaining({
                dataType: 'number',
                sourceField: 'bar',
              }),
            },
          },
        },
      });
    });

    it('selects the specific operation that was valid on drop', () => {
      const dragging = {
        field: { type: 'string', name: 'mystring', aggregatable: true },
        indexPatternId: 'foo',
      };
      const testState = dragDropState();
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          columnId={'col2'}
          filterOperations={op => op.isBucketed}
          layerId="myLayer"
        />
      );

      act(() => {
        const onDrop = wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('onDrop') as DropHandler;

        onDrop(dragging);
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          myLayer: {
            ...testState.layers.myLayer,
            columnOrder: ['col1', 'col2'],
            columns: {
              ...testState.layers.myLayer.columns,
              col2: expect.objectContaining({
                dataType: 'string',
                sourceField: 'mystring',
              }),
            },
          },
        },
      });
    });

    it('updates a column when a field is dropped', () => {
      const dragging = {
        field: { type: 'number', name: 'bar', aggregatable: true },
        indexPatternId: 'foo',
      };
      const testState = dragDropState();
      wrapper = shallow(
        <IndexPatternDimensionPanelComponent
          {...defaultProps}
          dragDropContext={{
            ...dragDropContext,
            dragging,
          }}
          state={testState}
          filterOperations={op => op.dataType === 'number'}
          layerId="myLayer"
        />
      );

      act(() => {
        const onDrop = wrapper
          .find('[data-test-subj="indexPattern-dropTarget"]')
          .first()
          .prop('onDrop') as DropHandler;

        onDrop(dragging);
      });

      expect(setState).toBeCalledTimes(1);
      expect(setState).toHaveBeenCalledWith({
        ...testState,
        layers: {
          myLayer: expect.objectContaining({
            columns: expect.objectContaining({
              col1: expect.objectContaining({
                dataType: 'number',
                sourceField: 'bar',
              }),
            }),
          }),
        },
      });
    });
  });
});
