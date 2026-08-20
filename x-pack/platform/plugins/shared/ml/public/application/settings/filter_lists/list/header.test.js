/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithI18n } from '../../../test_utils/render_with_ml_context';
import React from 'react';

// Mock the Kibana context
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (Component) => {
    const MockedComponent = (props) => {
      const kibana = {
        services: {
          docLinks: {
            links: {
              ml: {
                customRules:
                  'https://www.elastic.co/guide/en/machine-learning/current/ml-rules.html',
              },
            },
          },
        },
      };
      return <Component {...props} kibana={kibana} />;
    };
    return MockedComponent;
  },
}));

jest.mock('../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      application: {
        navigateToApp: jest.fn(),
        getUrlForApp: jest.fn(() => '/app/management/ml/ad_settings/'),
      },
    },
  }),
  useNavigateToPath: () => jest.fn(),
}));

import { FilterListsHeader } from './header';

describe('Filter Lists Header', () => {
  const refreshFilterLists = jest.fn();

  const requiredProps = {
    totalCount: 3,
    refreshFilterLists,
  };

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const { getByRole, getByTestId, getByText } = renderWithI18n(<FilterListsHeader {...props} />);

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Filter Lists');
    expect(getByText('3 in total')).toBeInTheDocument();
    expect(getByTestId('mlFilterListRefreshButton')).toHaveTextContent('Refresh');
    expect(getByRole('link', { name: /^Learn more/ })).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/machine-learning/current/ml-rules.html'
    );
  });
});
