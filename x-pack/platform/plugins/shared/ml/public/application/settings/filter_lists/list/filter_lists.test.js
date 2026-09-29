/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { FilterLists } from './filter_lists';

// Mocking the child components to just assert that they get the data
// received via the async call using mlApi in the main component.
vi.mock('../../../components/help_menu', () => {
      const mocked = {
      HelpMenu: ({ docLink }) => <div data-test-subj="mockHelpMenu" data-link={docLink} />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./header', () => {
      const mocked = {
      FilterListsHeader: ({ totalCount }) => (
        <div data-test-subj="mockFilterListsHeader">{totalCount}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./table', () => {
      const mocked = {
      FilterListsTable: ({ filterLists, selectedFilterLists }) => (
        <div
          data-test-subj="mockFilterListsTable"
          data-filter-lists={JSON.stringify(filterLists)}
          data-selected-filter-lists={JSON.stringify(selectedFilterLists)}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../capabilities/check_capabilities', () => {
      const mocked = {
      checkPermission: () => true,
    };
      return { ...mocked, default: mocked };
    });

// Mock the call for loading the list of filters.
const mockTestFilter = {
  filter_id: 'safe_domains',
  description: 'List of known safe domains',
  item_count: 500,
  used_by: { jobs: ['dns_exfiltration'] },
};
const mockKibanaProp = {
  services: {
    docLinks: { links: { ml: { customRules: 'https://customRules' } } },
    mlServices: {
      mlApi: {
        filters: {
          filtersStats: () => {
            return Promise.resolve([mockTestFilter]);
          },
        },
      },
    },
  },
};

const mockReact = React;
vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      withKibana: (type) => {
        const EnhancedType = (props) => {
          return mockReact.createElement(type, {
            ...props,
            kibana: mockKibanaProp,
          });
        };
        return EnhancedType;
      },
    };
      return { ...mocked, default: mocked };
    });

const props = {
  canCreateFilter: true,
  canDeleteFilter: true,
};

describe('Filter Lists', () => {
  test('renders a list of filters', async () => {
    render(<FilterLists {...props} />);

    // Wait for the elements to appear
    await waitFor(() => {
      expect(screen.getByTestId('mockFilterListsHeader')).toHaveTextContent('1');
    });

    // Assert that the child components receive the data based on async calls and kibana context.
    const filterListsTableElement = screen.getByTestId('mockFilterListsTable');
    expect(filterListsTableElement).toHaveAttribute(
      'data-filter-lists',
      JSON.stringify([mockTestFilter])
    );
    expect(filterListsTableElement).toHaveAttribute('data-selected-filter-lists', '[]');

    const helpMenuElement = screen.getByTestId('mockHelpMenu');
    expect(helpMenuElement).toHaveAttribute('data-link', 'https://customRules');
  });
});
