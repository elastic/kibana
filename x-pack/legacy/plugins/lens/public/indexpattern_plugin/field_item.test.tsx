/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import { FieldItem, FieldItemProps } from './field_item';
import { coreMock } from 'src/core/public/mocks';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { npStart } from 'ui/new_platform';
import { FieldFormatsStart } from '../../../../../../src/plugins/data/public';
import { IndexPattern } from './types';

jest.mock('ui/new_platform');

const waitForPromises = () => new Promise(resolve => setTimeout(resolve));

describe('IndexPattern Field Item', () => {
  let defaultProps: FieldItemProps;
  let indexPattern: IndexPattern;
  let core: ReturnType<typeof coreMock['createSetup']>;

  beforeEach(() => {
    indexPattern = {
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
    } as IndexPattern;

    core = coreMock.createSetup();
    core.http.post.mockClear();
    defaultProps = {
      indexPattern,
      core,
      highlight: '',
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { query: '', language: 'lucene' },
      filters: [],
      field: {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      exists: true,
    };

    npStart.plugins.data.fieldFormats = ({
      getDefaultInstance: jest.fn(() => ({
        convert: jest.fn((s: unknown) => JSON.stringify(s)),
      })),
    } as unknown) as FieldFormatsStart;
  });

  it('should request field stats every time the button is clicked', async () => {
    let resolveFunction: (arg: unknown) => void;

    core.http.post.mockImplementation(() => {
      return new Promise(resolve => {
        resolveFunction = resolve;
      });
    });

    const wrapper = mountWithIntl(<FieldItem {...defaultProps} />);

    wrapper.find('[data-test-subj="lnsFieldListPanelField-bytes"]').simulate('click');

    expect(core.http.post).toHaveBeenCalledWith(
      `/api/lens/index_stats/my-fake-index-pattern/field`,
      {
        body: JSON.stringify({
          dslQuery: {
            bool: {
              must: [{ match_all: {} }],
              filter: [],
              should: [],
              must_not: [],
            },
          },
          fromDate: 'now-7d',
          toDate: 'now',
          timeFieldName: 'timestamp',
          field: {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          },
        }),
      }
    );

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(true);

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    resolveFunction!({
      totalDocuments: 4633,
      sampledDocuments: 4633,
      sampledValues: 4633,
      histogram: {
        buckets: [{ count: 705, key: 0 }],
      },
      topValues: {
        buckets: [{ count: 147, key: 0 }],
      },
    });

    await waitForPromises();
    wrapper.update();

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);

    wrapper.find('[data-test-subj="lnsFieldListPanelField-bytes"]').simulate('click');
    expect(core.http.post).toHaveBeenCalledTimes(1);

    act(() => {
      const closePopover = wrapper.find(EuiPopover).prop('closePopover');

      closePopover();
    });

    expect(wrapper.find(EuiPopover).prop('isOpen')).toEqual(false);

    act(() => {
      wrapper.setProps({
        dateRange: {
          fromDate: 'now-14d',
          toDate: 'now-7d',
        },
        query: { query: 'geo.src : "US"', language: 'kuery' },
        filters: [
          {
            match: { phrase: { 'geo.dest': 'US' } },
          },
        ],
      });
    });

    wrapper.find('[data-test-subj="lnsFieldListPanelField-bytes"]').simulate('click');

    expect(core.http.post).toHaveBeenCalledTimes(2);
    expect(core.http.post).toHaveBeenLastCalledWith(
      `/api/lens/index_stats/my-fake-index-pattern/field`,
      {
        body: JSON.stringify({
          dslQuery: {
            bool: {
              must: [],
              filter: [
                {
                  bool: {
                    should: [{ match_phrase: { 'geo.src': 'US' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  match: { phrase: { 'geo.dest': 'US' } },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          fromDate: 'now-14d',
          toDate: 'now-7d',
          timeFieldName: 'timestamp',
          field: {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          },
        }),
      }
    );
  });
});
