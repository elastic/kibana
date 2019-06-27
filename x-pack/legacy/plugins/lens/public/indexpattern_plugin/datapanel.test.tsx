/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React, { ChangeEvent, ReactElement } from 'react';
import { EuiComboBox, EuiFieldSearch, EuiContextMenuPanel } from '@elastic/eui';
import { IndexPatternPrivateState } from './indexpattern';
import { DatasourceDataPanelProps } from '../types';
import { createMockedDragDropContext } from './mocks';
import { IndexPatternDataPanel } from './datapanel';
import { FieldItem } from './field_item';
import { act } from 'react-dom/test-utils';

jest.mock('./loader');

const initialState: IndexPatternPrivateState = {
  currentIndexPatternId: '1',
  columnOrder: ['col1'],
  columns: {
    col1: {
      operationId: 'op1',
      label: 'My Op',
      dataType: 'string',
      isBucketed: true,
      operationType: 'terms',
      sourceField: 'op',
      params: {
        size: 5,
        orderBy: {
          type: 'alphabetical',
        },
      },
    },
  },
  indexPatterns: {
    '1': {
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
          name: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'unsupported',
          type: 'geo',
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
    '2': {
      id: '2',
      title: 'my-fake-restricted-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              fixed_interval: '1d',
              delay: '7d',
              time_zone: 'UTC',
            },
          },
        },
        {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            histogram: {
              agg: 'histogram',
              interval: 1000,
            },
            avg: {
              agg: 'avg',
            },
            max: {
              agg: 'max',
            },
            min: {
              agg: 'min',
            },
            sum: {
              agg: 'sum',
            },
          },
        },
        {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        },
      ],
    },
  },
};
describe('IndexPattern Data Panel', () => {
  let defaultProps: DatasourceDataPanelProps<IndexPatternPrivateState>;

  beforeEach(() => {
    defaultProps = {
      state: initialState,
      setState: jest.fn(),
      dragDropContext: createMockedDragDropContext(),
    };
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallow(
      <IndexPatternDataPanel
        {...defaultProps}
        state={{ ...initialState, currentIndexPatternId: '', indexPatterns: {} }}
      />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]')).toHaveLength(1);
  });

  it('should call setState when the index pattern is switched', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    wrapper.find('[data-test-subj="indexPattern-switch-link"]').simulate('click');

    const comboBox = wrapper.find(EuiComboBox);

    comboBox.prop('onChange')!([
      {
        label: initialState.indexPatterns['2'].title,
        value: '2',
      },
    ]);

    expect(defaultProps.setState).toHaveBeenCalledWith({
      ...initialState,
      currentIndexPatternId: '2',
    });
  });

  it('should list all supported fields in the pattern sorted alphabetically', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
      'source',
      'timestamp',
    ]);
  });

  it('should filter down by name', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    act(() => {
      wrapper.find(EuiFieldSearch).prop('onChange')!({ target: { value: 'mem' } } as ChangeEvent<
        HTMLInputElement
      >);
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'memory',
    ]);
  });

  it('should filter down by type', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
    ]);
  });

  it('should toggle type if clicked again', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
      'source',
      'timestamp',
    ]);
  });

  it('should filter down by type and by name', async () => {
    const wrapper = shallow(<IndexPatternDataPanel {...defaultProps} />);

    act(() => {
      wrapper.find(EuiFieldSearch).prop('onChange')!({ target: { value: 'mem' } } as ChangeEvent<
        HTMLInputElement
      >);
    });

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'memory',
    ]);
  });
});
