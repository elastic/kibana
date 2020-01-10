/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { EuiBadge, EuiPagination } from '@elastic/eui';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../../../../server/np_ready/lib/es_migration_apis';
import { GroupByOption, LevelFilterOption } from '../../../types';
import { DeprecationAccordion, filterDeps, GroupedDeprecations } from './grouped';

describe('filterDeps', () => {
  test('filters on levels', () => {
    const fd = filterDeps(LevelFilterOption.critical);
    expect(fd({ level: 'critical' } as DeprecationInfo)).toBe(true);
    expect(fd({ level: 'warning' } as DeprecationInfo)).toBe(false);
  });

  test('filters on title search', () => {
    const fd = filterDeps(LevelFilterOption.critical, 'wow');
    expect(fd({ level: 'critical', message: 'the wow error' } as DeprecationInfo)).toBe(true);
    expect(fd({ level: 'critical', message: 'other error' } as DeprecationInfo)).toBe(false);
  });

  test('filters on index search', () => {
    const fd = filterDeps(LevelFilterOption.critical, 'myIndex');
    expect(
      fd({
        level: 'critical',
        message: 'the wow error',
        index: 'myIndex-2',
      } as EnrichedDeprecationInfo)
    ).toBe(true);
    expect(
      fd({
        level: 'critical',
        message: 'other error',
        index: 'notIndex',
      } as EnrichedDeprecationInfo)
    ).toBe(false);
  });

  test('filters on node search', () => {
    const fd = filterDeps(LevelFilterOption.critical, 'myNode');
    expect(
      fd({
        level: 'critical',
        message: 'the wow error',
        index: 'myNode-123',
      } as EnrichedDeprecationInfo)
    ).toBe(true);
    expect(
      fd({
        level: 'critical',
        message: 'other error',
        index: 'notNode',
      } as EnrichedDeprecationInfo)
    ).toBe(false);
  });
});

describe('GroupedDeprecations', () => {
  const defaultProps = {
    currentFilter: LevelFilterOption.all,
    search: '',
    currentGroupBy: GroupByOption.message,
    allDeprecations: [
      { message: 'Cluster error 1', url: '', level: 'warning' },
      { message: 'Cluster error 2', url: '', level: 'critical' },
    ] as EnrichedDeprecationInfo[],
  };

  describe('expand + collapse all', () => {
    const expectNumOpen = (wrapper: any, numExpected: number) =>
      expect(wrapper.find('div.euiAccordion-isOpen')).toHaveLength(numExpected);

    test('clicking opens and closes panels', () => {
      const wrapper = mountWithIntl(<GroupedDeprecations {...defaultProps} />);
      expectNumOpen(wrapper, 0);

      // Test expand all
      wrapper.find('button[data-test-subj="expandAll"]').simulate('click');
      expectNumOpen(wrapper, 2);

      // Test collapse all
      wrapper.find('button[data-test-subj="collapseAll"]').simulate('click');
      expectNumOpen(wrapper, 0);
    });

    test('clicking overrides current state when some are open', () => {
      const wrapper = mountWithIntl(<GroupedDeprecations {...defaultProps} />);

      // Open a single deprecation
      wrapper
        .find('button.euiAccordion__button')
        .first()
        .simulate('click');
      expectNumOpen(wrapper, 1);

      // Test expand all
      wrapper.find('button[data-test-subj="expandAll"]').simulate('click');
      expectNumOpen(wrapper, 2);

      // Close a single deprecation
      wrapper
        .find('button.euiAccordion__button')
        .first()
        .simulate('click');
      expectNumOpen(wrapper, 1);

      // Test collapse all
      wrapper.find('button[data-test-subj="collapseAll"]').simulate('click');
      expectNumOpen(wrapper, 0);
    });
  });

  describe('pagination', () => {
    const paginationProps = {
      ...defaultProps,
      allDeprecations: range(0, 40).map(i => ({
        message: `Message ${i}`,
        level: 'warning',
      })) as DeprecationInfo[],
    };

    test('it only displays 25 items', () => {
      const wrapper = shallowWithIntl(<GroupedDeprecations {...paginationProps} />);
      expect(wrapper.find(DeprecationAccordion)).toHaveLength(25);
    });

    test('it displays pagination', () => {
      const wrapper = shallowWithIntl(<GroupedDeprecations {...paginationProps} />);
      expect(wrapper.find(EuiPagination).exists()).toBe(true);
    });

    test('shows next page on click', () => {
      const wrapper = mountWithIntl(<GroupedDeprecations {...paginationProps} />);
      wrapper.find('button[data-test-subj="pagination-button-next"]').simulate('click');
      expect(wrapper.find(DeprecationAccordion)).toHaveLength(15); // 40 total - 25 first page = 15 second page
    });
  });

  describe('grouping', () => {
    test('group by message', () => {
      const wrapper = shallowWithIntl(
        <GroupedDeprecations
          {...defaultProps}
          currentGroupBy={GroupByOption.message}
          allDeprecations={[
            { message: 'Cluster error 1', url: '', level: 'warning' },
            { message: 'Cluster error 2', url: '', level: 'warning' },
            { message: 'Cluster error 2', url: '', level: 'warning' },
            { message: 'Cluster error 2', url: '', level: 'warning' },
          ]}
        />
      );

      // Only 2 groups should exist b/c there are only 2 unique messages
      expect(wrapper.find(DeprecationAccordion)).toHaveLength(2);
    });

    test('group by index', () => {
      const wrapper = shallowWithIntl(
        <GroupedDeprecations
          {...defaultProps}
          currentGroupBy={GroupByOption.index}
          allDeprecations={[
            {
              message: 'Cluster error 1',
              url: '',
              level: 'warning',
              index: 'index1',
            },
            {
              message: 'Cluster error 2',
              url: '',
              level: 'warning',
              index: 'index1',
            },
            {
              message: 'Cluster error 2',
              url: '',
              level: 'warning',
              index: 'index2',
            },
            {
              message: 'Cluster error 2',
              url: '',
              level: 'warning',
              index: 'index3',
            },
          ]}
        />
      );

      // Only 3 groups should exist b/c there are only 3 unique indexes
      expect(wrapper.find(DeprecationAccordion)).toHaveLength(3);
    });
  });
});

describe('DeprecationAccordion', () => {
  const defaultProps = {
    id: 'x',
    title: 'Issue 1',
    currentGroupBy: GroupByOption.message,
    forceExpand: false,
    deprecations: [{ index: 'index1' }, { index: 'index2' }] as EnrichedDeprecationInfo[],
  };

  test('shows indices count badge', () => {
    const wrapper = mountWithIntl(<DeprecationAccordion {...defaultProps} />);
    expect(
      wrapper
        .find(EuiBadge)
        .find('[data-test-subj="indexCount"]')
        .text()
    ).toEqual('2');
  });
});
