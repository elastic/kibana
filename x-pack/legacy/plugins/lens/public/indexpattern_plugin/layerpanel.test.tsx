/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { IndexPatternPrivateState } from './indexpattern';
import { act } from 'react-dom/test-utils';
import { IndexPatternLayerPanelProps, LayerPanel } from './layerpanel';
import { updateLayerIndexPattern } from './state_helpers';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';

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

  function clickLabel(instance: ReactWrapper) {
    act(() => {
      instance
        .find('[data-test-subj="lns_layerIndexPatternLabel"]')
        .first()
        .simulate('click');
    });

    instance.update();
  }

  it('should list all index patterns but the current one', () => {
    const instance = mount(<LayerPanel {...defaultProps} />);
    clickLabel(instance);

    expect(
      instance
        .find(EuiComboBox)
        .prop('options')!
        .map(option => option.label)
    ).toEqual(['my-fake-restricted-pattern', 'my-compatible-pattern']);
  });

  it('should indicate whether the switch can be made without lossing data', () => {
    const instance = mount(<LayerPanel {...defaultProps} />);
    clickLabel(instance);

    expect(
      instance
        .find(EuiComboBox)
        .prop('options')!
        .map(option => (option.value as { isTransferable: boolean }).isTransferable)
    ).toEqual([false, true]);
  });

  it('should switch data panel to target index pattern', () => {
    const instance = mount(<LayerPanel {...defaultProps} />);
    clickLabel(instance);

    act(() => {
      instance.find(EuiComboBox).prop('onChange')!([
        {
          label: 'my-compatible-pattern',
          value: defaultProps.state.indexPatterns['3'],
        },
      ]);
    });

    expect(defaultProps.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        currentIndexPatternId: '3',
      })
    );
  });

  it('should switch using updateLayerIndexPattern', () => {
    const instance = mount(<LayerPanel {...defaultProps} />);
    clickLabel(instance);

    act(() => {
      instance.find(EuiComboBox).prop('onChange')!([
        {
          label: 'my-compatible-pattern',
          value: defaultProps.state.indexPatterns['3'],
        },
      ]);
    });

    expect(updateLayerIndexPattern).toHaveBeenCalledWith(
      defaultProps.state.layers.first,
      defaultProps.state.indexPatterns['3']
    );
  });
});
