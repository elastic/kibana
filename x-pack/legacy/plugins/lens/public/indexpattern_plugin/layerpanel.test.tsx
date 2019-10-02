/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { IndexPatternPrivateState } from './indexpattern';
import { IndexPatternLayerPanelProps, LayerPanel } from './layerpanel';
import { updateLayerIndexPattern } from './state_helpers';
import { shallowWithIntl as shallow } from 'test_utils/enzyme_helpers';
import { ShallowWrapper } from 'enzyme';
import { EuiSelectable, EuiSelectableList } from '@elastic/eui';
import { ChangeIndexPattern } from './change_indexpattern';

jest.mock('ui/new_platform');
jest.mock('./state_helpers');

const initialState: IndexPatternPrivateState = {
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
          name: 'memory',
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
describe('Layer Data Panel', () => {
  let defaultProps: IndexPatternLayerPanelProps;

  beforeEach(() => {
    defaultProps = {
      layerId: 'first',
      state: initialState,
      setState: jest.fn(),
    };
  });

  function getIndexPatternPickerList(instance: ShallowWrapper) {
    return instance
      .find(ChangeIndexPattern)
      .first()
      .dive()
      .find(EuiSelectable);
  }

  function selectIndexPatternPickerOption(instance: ShallowWrapper, selectedLabel: string) {
    const options: Array<{ label: string; checked?: 'on' | 'off' }> = getIndexPatternPickerOptions(
      instance
    ).map(option =>
      option.label === selectedLabel
        ? { ...option, checked: 'on' }
        : { ...option, checked: undefined }
    );
    return getIndexPatternPickerList(instance).prop('onChange')!(options);
  }

  function getIndexPatternPickerOptions(instance: ShallowWrapper) {
    return getIndexPatternPickerList(instance)
      .dive()
      .find(EuiSelectableList)
      .prop('options');
  }

  it('should list all index patterns', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);

    expect(getIndexPatternPickerOptions(instance)!.map(option => option.label)).toEqual([
      'my-fake-index-pattern',
      'my-fake-restricted-pattern',
      'my-compatible-pattern',
    ]);
  });

  it('should indicate whether the switch can be made without losing data', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);

    expect(
      getIndexPatternPickerOptions(instance)!.map(option =>
        Boolean(
          option.append &&
            (option.append as ReactElement).props.content.includes(
              'Not all operations are compatible with this index pattern'
            )
        )
      )
    ).toEqual([false, true, false]);
  });

  it('should switch data panel to target index pattern', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);

    selectIndexPatternPickerOption(instance, 'my-compatible-pattern');

    expect(defaultProps.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        currentIndexPatternId: '3',
      })
    );
  });

  it('should switch using updateLayerIndexPattern', () => {
    const instance = shallow(<LayerPanel {...defaultProps} />);
    selectIndexPatternPickerOption(instance, 'my-compatible-pattern');

    expect(updateLayerIndexPattern).toHaveBeenCalledWith(
      defaultProps.state.layers.first,
      defaultProps.state.indexPatterns['3']
    );
  });
});
