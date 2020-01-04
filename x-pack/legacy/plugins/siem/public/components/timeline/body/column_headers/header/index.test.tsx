/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import * as React from 'react';

import { Direction } from '../../../../../graphql/types';
import { TestProviders } from '../../../../../mock';
import { Sort } from '../../sort';
import { CloseButton } from '../actions';
import { ColumnHeaderType } from '../column_header';
import { defaultHeaders } from '../default_headers';

import { HeaderComponent } from '.';
import { getNewSortDirectionOnClick, getNextSortDirection, getSortDirection } from './helpers';

const filteredColumnHeader: ColumnHeaderType = 'text-filter';

describe('Header', () => {
  const columnHeader = defaultHeaders[0];
  const sort: Sort = {
    columnId: columnHeader.id,
    sortDirection: Direction.desc,
  };
  const timelineId = 'fakeId';

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <HeaderComponent
        header={columnHeader}
        onColumnRemoved={jest.fn()}
        onColumnResized={jest.fn()}
        onColumnSorted={jest.fn()}
        setIsResizing={jest.fn()}
        sort={sort}
        timelineId={timelineId}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  describe('rendering', () => {
    test('it renders the header text', () => {
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={columnHeader}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find(`[data-test-subj="header-text-${columnHeader.id}"]`)
          .first()
          .text()
      ).toEqual(columnHeader.id);
    });

    test('it renders the header text alias when label is provided', () => {
      const label = 'Timestamp';
      const headerWithLabel = { ...columnHeader, label };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerWithLabel}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find(`[data-test-subj="header-text-${columnHeader.id}"]`)
          .first()
          .text()
      ).toEqual(label);
    });

    test('it renders a sort indicator', () => {
      const headerSortable = { ...columnHeader, aggregatable: true };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerSortable}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="header-sort-indicator"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders a filter', () => {
      const columnWithFilter = {
        ...columnHeader,
        columnHeaderType: filteredColumnHeader,
      };

      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={columnWithFilter}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="textFilter"]')
          .first()
          .props()
      ).toHaveProperty('placeholder');
    });
  });

  describe('onColumnSorted', () => {
    test('it invokes the onColumnSorted callback when the header sort button is clicked', () => {
      const mockOnColumnSorted = jest.fn();
      const headerSortable = { ...columnHeader, aggregatable: true };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerSortable}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={mockOnColumnSorted}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');

      expect(mockOnColumnSorted).toBeCalledWith({
        columnId: columnHeader.id,
        sortDirection: 'asc', // (because the previous state was Direction.desc)
      });
    });

    test('it does NOT render the header sort button when aggregatable is false', () => {
      const mockOnColumnSorted = jest.fn();
      const headerSortable = { ...columnHeader, aggregatable: false };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerSortable}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={mockOnColumnSorted}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-sort-button"]').length).toEqual(0);
    });

    test('it does NOT render the header sort button when aggregatable is missing', () => {
      const mockOnColumnSorted = jest.fn();
      const headerSortable = { ...columnHeader };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerSortable}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={mockOnColumnSorted}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-sort-button"]').length).toEqual(0);
    });

    test('it does NOT invoke the onColumnSorted callback when the header is clicked and aggregatable is undefined', () => {
      const mockOnColumnSorted = jest.fn();
      const headerSortable = { ...columnHeader, aggregatable: undefined };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={headerSortable}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={mockOnColumnSorted}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header"]')
        .first()
        .simulate('click');

      expect(mockOnColumnSorted).not.toHaveBeenCalled();
    });
  });

  describe('CloseButton', () => {
    test('it invokes the onColumnRemoved callback with the column ID when the close button is clicked', () => {
      const mockOnColumnRemoved = jest.fn();

      const wrapper = mount(
        <CloseButton columnId={columnHeader.id} onColumnRemoved={mockOnColumnRemoved} />
      );

      wrapper
        .find('[data-test-subj="remove-column"]')
        .first()
        .simulate('click');

      expect(mockOnColumnRemoved).toBeCalledWith(columnHeader.id);
    });
  });

  describe('getSortDirection', () => {
    test('it returns the sort direction when the header id matches the sort column id', () => {
      expect(getSortDirection({ header: columnHeader, sort })).toEqual(sort.sortDirection);
    });

    test('it returns "none" when sort direction when the header id does NOT match the sort column id', () => {
      const nonMatching: Sort = {
        columnId: 'differentSocks',
        sortDirection: Direction.desc,
      };

      expect(getSortDirection({ header: columnHeader, sort: nonMatching })).toEqual('none');
    });
  });

  describe('getNextSortDirection', () => {
    test('it returns "asc" when the current direction is "desc"', () => {
      const sortDescending: Sort = { columnId: columnHeader.id, sortDirection: Direction.desc };

      expect(getNextSortDirection(sortDescending)).toEqual('asc');
    });

    test('it returns "desc" when the current direction is "asc"', () => {
      const sortAscending: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.asc,
      };

      expect(getNextSortDirection(sortAscending)).toEqual(Direction.desc);
    });

    test('it returns "desc" by default', () => {
      const sortNone: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'none',
      };

      expect(getNextSortDirection(sortNone)).toEqual(Direction.desc);
    });
  });

  describe('getNewSortDirectionOnClick', () => {
    test('it returns the expected new sort direction when the header id matches the sort column id', () => {
      const sortMatches: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.desc,
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortMatches,
        })
      ).toEqual(Direction.asc);
    });

    test('it returns the expected new sort direction when the header id does NOT match the sort column id', () => {
      const sortDoesNotMatch: Sort = {
        columnId: 'someOtherColumn',
        sortDirection: 'none',
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortDoesNotMatch,
        })
      ).toEqual(Direction.desc);
    });
  });

  describe('text truncation styling', () => {
    test('truncates the header text with an ellipsis', () => {
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={columnHeader}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-text-${columnHeader.id}"]`)).toHaveStyleRule(
        'text-overflow',
        'ellipsis'
      );
    });
  });

  describe('header tooltip', () => {
    test('it has a tooltip to display the properties of the field', () => {
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent
            header={columnHeader}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-tooltip"]').exists()).toEqual(true);
    });
  });

  describe('setIsResizing', () => {
    test('setIsResizing have been call when it renders actions', () => {
      const mockSetIsResizing = jest.fn();
      mount(
        <TestProviders>
          <HeaderComponent
            header={columnHeader}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            setIsResizing={mockSetIsResizing}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(mockSetIsResizing).toHaveBeenCalled();
    });
  });
});
