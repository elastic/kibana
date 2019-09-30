/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React, { ChangeEvent } from 'react';
import { createMockedDragDropContext } from './mocks';
import { InnerIndexPatternDataPanel, IndexPatternDataPanel, MemoizedDataPanel } from './datapanel';
import { FieldItem } from './field_item';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPrivateState } from './types';
import { ChangeIndexPattern } from './change_indexpattern';

jest.mock('ui/new_platform');
jest.mock('./loader');
jest.mock('../../../../../../src/legacy/ui/public/registry/field_formats');

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

const initialState: IndexPatternPrivateState = {
  indexPatternRefs: [],
  currentIndexPatternId: '1',
  showEmptyFields: false,
  layers: {
    first: {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
        },
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'avg',
          sourceField: 'memory',
        },
      },
    },
    second: {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
        },
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'avg',
          sourceField: 'bytes',
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
        {
          name: 'client',
          type: 'ip',
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
    '3': {
      id: '3',
      title: 'my-compatible-pattern',
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
  },
};
describe('IndexPattern Data Panel', () => {
  let defaultProps: Parameters<typeof InnerIndexPatternDataPanel>[0];
  let core: ReturnType<typeof coreMock['createSetup']>;

  beforeEach(() => {
    core = coreMock.createSetup();
    defaultProps = {
      indexPatternRefs: [],
      dragDropContext: createMockedDragDropContext(),
      currentIndexPatternId: '1',
      indexPatterns: initialState.indexPatterns,
      onChangeIndexPattern: jest.fn(),
      core,
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { query: '', language: 'lucene' },
      showEmptyFields: false,
      onToggleEmptyFields: jest.fn(),
    };
  });

  it('should call change index pattern callback', async () => {
    const setStateSpy = jest.fn();
    const state = {
      ...initialState,
      layers: { first: { indexPatternId: '1', columnOrder: [], columns: {} } },
    };
    const changeIndexPattern = jest.fn();
    const wrapper = shallow(
      <IndexPatternDataPanel
        changeIndexPattern={changeIndexPattern}
        {...defaultProps}
        state={state}
        setState={setStateSpy}
        dragDropContext={{ dragging: {}, setDragging: () => {} }}
      />
    );

    wrapper.find(MemoizedDataPanel).prop('onChangeIndexPattern')!('2');

    expect(changeIndexPattern).toHaveBeenCalledWith('2', state, setStateSpy);
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallow(
      <InnerIndexPatternDataPanel {...defaultProps} currentIndexPatternId="" indexPatterns={{}} />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]')).toHaveLength(1);
  });

  it('should call setState when the index pattern is switched', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    wrapper.find(ChangeIndexPattern).prop('onChangeIndexPattern')('2');

    expect(defaultProps.onChangeIndexPattern).toHaveBeenCalledWith('2');
  });

  describe('loading existence data', () => {
    beforeEach(() => {
      core.http.post.mockClear();
    });

    it('loads existence data and updates the index pattern', async () => {
      core.http.post.mockResolvedValue({
        timestamp: {
          exists: true,
          cardinality: 500,
          count: 500,
        },
      });
      const updateFields = jest.fn();
      mount(<InnerIndexPatternDataPanel {...defaultProps} updateFieldsWithCounts={updateFields} />);

      await waitForPromises();

      expect(core.http.post).toHaveBeenCalledWith(`/api/lens/index_stats/my-fake-index-pattern`, {
        body: JSON.stringify({
          fromDate: 'now-7d',
          toDate: 'now',
          size: 500,
          timeFieldName: 'timestamp',
          fields: [
            {
              name: 'timestamp',
              type: 'date',
            },
            {
              name: 'bytes',
              type: 'number',
            },
            {
              name: 'memory',
              type: 'number',
            },
            {
              name: 'unsupported',
              type: 'geo',
            },
            {
              name: 'source',
              type: 'string',
            },
            {
              name: 'client',
              type: 'ip',
            },
          ],
        }),
      });

      expect(updateFields).toHaveBeenCalledWith('1', [
        {
          name: 'timestamp',
          type: 'date',
          exists: true,
          cardinality: 500,
          count: 500,
          aggregatable: true,
          searchable: true,
        },
        ...defaultProps.indexPatterns['1'].fields
          .slice(1)
          .map(field => ({ ...field, exists: false })),
      ]);
    });

    it('does not attempt to load existence data if the index pattern has it', async () => {
      const updateFields = jest.fn();
      const newIndexPatterns = {
        ...defaultProps.indexPatterns,
        '1': {
          ...defaultProps.indexPatterns['1'],
          hasExistence: true,
        },
      };

      const props = { ...defaultProps, indexPatterns: newIndexPatterns };

      mount(<InnerIndexPatternDataPanel {...props} updateFieldsWithCounts={updateFields} />);

      await waitForPromises();

      expect(core.http.post).not.toHaveBeenCalled();
    });
  });

  describe('while showing empty fields', () => {
    it('should list all supported fields in the pattern sorted alphabetically', async () => {
      const wrapper = shallow(
        <InnerIndexPatternDataPanel {...defaultProps} showEmptyFields={true} />
      );

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'bytes',
        'client',
        'memory',
        'source',
        'timestamp',
      ]);
    });

    it('should filter down by name', () => {
      const wrapper = shallow(
        <InnerIndexPatternDataPanel {...defaultProps} showEmptyFields={true} />
      );

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').prop('onChange')!({
          target: { value: 'mem' },
        } as ChangeEvent<HTMLInputElement>);
      });

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });

    it('should filter down by type', () => {
      const wrapper = mount(
        <InnerIndexPatternDataPanel {...defaultProps} showEmptyFields={true} />
      );

      wrapper
        .find('[data-test-subj="lnsIndexPatternFiltersToggle"]')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="typeFilter-number"]')
        .first()
        .simulate('click');

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'bytes',
        'memory',
      ]);
    });

    it('should toggle type if clicked again', () => {
      const wrapper = mount(
        <InnerIndexPatternDataPanel {...defaultProps} showEmptyFields={true} />
      );

      wrapper
        .find('[data-test-subj="lnsIndexPatternFiltersToggle"]')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="typeFilter-number"]')
        .first()
        .simulate('click');
      wrapper
        .find('[data-test-subj="typeFilter-number"]')
        .first()
        .simulate('click');

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'bytes',
        'client',
        'memory',
        'source',
        'timestamp',
      ]);
    });

    it('should filter down by type and by name', () => {
      const wrapper = mount(
        <InnerIndexPatternDataPanel {...defaultProps} showEmptyFields={true} />
      );

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').prop('onChange')!({
          target: { value: 'mem' },
        } as ChangeEvent<HTMLInputElement>);
      });

      wrapper
        .find('[data-test-subj="lnsIndexPatternFiltersToggle"]')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="typeFilter-number"]')
        .first()
        .simulate('click');

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });
  });

  describe('filtering out empty fields', () => {
    let emptyFieldsTestProps: typeof defaultProps;

    beforeEach(() => {
      emptyFieldsTestProps = {
        ...defaultProps,
        indexPatterns: {
          ...defaultProps.indexPatterns,
          '1': {
            ...defaultProps.indexPatterns['1'],
            hasExistence: true,
            fields: defaultProps.indexPatterns['1'].fields.map(field => ({
              ...field,
              exists: field.type === 'number',
            })),
          },
        },
        onToggleEmptyFields: jest.fn(),
      };
    });

    it('should list all supported fields in the pattern sorted alphabetically', async () => {
      const wrapper = shallow(<InnerIndexPatternDataPanel {...emptyFieldsTestProps} />);

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'bytes',
        'memory',
      ]);
    });

    it('should filter down by name', () => {
      const wrapper = shallow(
        <InnerIndexPatternDataPanel {...emptyFieldsTestProps} showEmptyFields={true} />
      );

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').prop('onChange')!({
          target: { value: 'mem' },
        } as ChangeEvent<HTMLInputElement>);
      });

      expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });

    it('should allow removing the filter for data', () => {
      const wrapper = mount(<InnerIndexPatternDataPanel {...emptyFieldsTestProps} />);

      wrapper
        .find('[data-test-subj="lnsIndexPatternFiltersToggle"]')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="lnsEmptyFilter"]')
        .first()
        .prop('onChange')!({} as ChangeEvent);

      expect(emptyFieldsTestProps.onToggleEmptyFields).toHaveBeenCalled();
    });
  });
});
