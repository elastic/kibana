/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../helpers';
import { defaultHeaders } from './default_headers';
import { Direction } from '../../../../graphql/types';
import { mockBrowserFields } from '../../../../../public/containers/source/mock';
import { Sort } from '../sort';
import { TestProviders } from '../../../../mock/test_providers';
import { useMountAppended } from '../../../../utils/use_mount_appended';

import { ColumnHeadersComponent } from '.';

describe('ColumnHeaders', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: Direction.desc,
    };

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <ColumnHeadersComponent
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          browserFields={mockBrowserFields}
          columnHeaders={defaultHeaders}
          isSelectAllChecked={false}
          onColumnSorted={jest.fn()}
          onColumnRemoved={jest.fn()}
          onColumnResized={jest.fn()}
          onSelectAll={jest.fn}
          onUpdateColumns={jest.fn()}
          showEventsSelect={false}
          showSelectAllCheckbox={false}
          sort={sort}
          timelineId={'test'}
          toggleColumn={jest.fn()}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the field browser', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="field-browser"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders every column header', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      defaultHeaders.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="headers-group"]')
            .first()
            .text()
        ).toContain(h.id);
      });
    });

    test('it disables dragging during a column resize', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      defaultHeaders.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="draggable"]')
            .first()
            .prop('isDragDisabled')
        ).toBe(true);
      });
    });
  });
});
