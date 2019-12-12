/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';

import { TestProviders } from '../../../../mock';
import { hostsModel } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';

import { getArgs, UncommonProcessTable, getUncommonColumnsCurated } from '.';
import { mockData } from './mock';
import { HostsType } from '../../../../store/hosts/model';
import * as i18n from './translations';

describe('Uncommon Process Table Component', () => {
  const loadPage = jest.fn();

  describe('rendering', () => {
    test('it renders the default Uncommon process table', () => {
      const wrapper = shallow(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(toJson(wrapper.find('UncommonProcessTable'))).toMatchSnapshot();
    });

    test('it has a double dash (empty value) without any hosts at all', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .at(0)
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toBe(`Host names${getEmptyValue()}`);
    });

    test('it has a single host without any extra comma when the number of hosts is exactly 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .at(1)
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toBe('Host nameshello-world ');
    });

    test('it has a single link when the number of hosts is exactly 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .at(1)
          .find('.euiTableRowCell')
          .at(3)
          .find('a').length
      ).toBe(1);
    });

    test('it has a comma separated list of hosts when the number of hosts is greater than 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .at(2)
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toBe('Host nameshello-world,hello-world-2 ');
    });

    test('it has 2 links when the number of hosts is equal to 2', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .at(2)
          .find('.euiTableRowCell')
          .at(3)
          .find('a').length
      ).toBe(2);
    });

    test('it is empty when all hosts are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .at(3)
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toBe(`Host names${getEmptyValue()}`);
    });

    test('it has no link when all hosts are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .at(3)
          .find('.euiTableRowCell')
          .at(3)
          .find('a').length
      ).toBe(0);
    });

    test('it is returns two hosts when others are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            data={mockData.UncommonProcess.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.UncommonProcess.pageInfo)}
            id="uncommonProcess"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.UncommonProcess.pageInfo
            )}
            totalCount={mockData.UncommonProcess.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('.euiTableRow')
          .at(4)
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toBe('Host nameshello-world,hello-world-2 ');
    });
  });

  describe('#getArgs', () => {
    test('it works with string array', () => {
      const args = ['1', '2', '3'];
      expect(getArgs(args)).toEqual('1 2 3');
    });

    test('it returns null if empty array', () => {
      const args: string[] = [];
      expect(getArgs(args)).toEqual(null);
    });

    test('it returns null if given null', () => {
      expect(getArgs(null)).toEqual(null);
    });

    test('it returns null if given undefined', () => {
      expect(getArgs(undefined)).toEqual(null);
    });
  });

  describe('#getUncommonColumnsCurated', () => {
    test('on hosts page, we expect to get all columns', () => {
      expect(getUncommonColumnsCurated(HostsType.page).length).toEqual(6);
    });

    test('on host details page, we expect to remove two columns', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.length).toEqual(4);
    });

    test('on host page, we should have hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.page);
      expect(columns.some(col => col.name === i18n.HOSTS)).toEqual(true);
    });

    test('on host page, we should have number of hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.page);
      expect(columns.some(col => col.name === i18n.NUMBER_OF_HOSTS)).toEqual(true);
    });

    test('on host details page, we should not have hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.some(col => col.name === i18n.HOSTS)).toEqual(false);
    });

    test('on host details page, we should not have number of hosts', () => {
      const columns = getUncommonColumnsCurated(HostsType.details);
      expect(columns.some(col => col.name === i18n.NUMBER_OF_HOSTS)).toEqual(false);
    });
  });
});
