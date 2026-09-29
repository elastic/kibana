/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderWithI18n } from '../../../test_utils/render_with_ml_context';
import React from 'react';

// Mock the Kibana context
vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../contexts/kibana', () => {
  const mocked = {
    useMlKibana: () => ({
      services: {
        application: {
          navigateToApp: vi.fn(),
          getUrlForApp: vi.fn(() => '/app/management/ml/ad_settings/'),
        },
      },
    }),
    useNavigateToPath: () => vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { FilterListsHeader } from './header';

describe('Filter Lists Header', () => {
  const refreshFilterLists = vi.fn();

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
