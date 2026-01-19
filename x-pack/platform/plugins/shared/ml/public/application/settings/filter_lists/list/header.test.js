/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithI18n } from '@kbn/test-jest-helpers';
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

    const { container } = renderWithI18n(<FilterListsHeader {...props} />);

    expect(container).toMatchSnapshot();
  });
});
