/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Props } from './connectors_dropdown';
import { ConnectorsDropdown } from './connectors_dropdown';
import { renderWithTestingProviders } from '../../common/mock';
import { connectors } from './__mock__';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

describe('ConnectorsDropdown', () => {
  const props: Props = {
    disabled: false,
    connectors,
    isLoading: false,
    onChange: jest.fn(),
    selectedConnector: 'none',
  };

  test('it renders', () => {
    renderWithTestingProviders(<ConnectorsDropdown {...props} />);
    expect(screen.getByTestId('dropdown-connectors')).toBeInTheDocument();
  });

  test('it formats the connectors correctly', async () => {
    renderWithTestingProviders(<ConnectorsDropdown {...props} />);

    await userEvent.click(screen.getByTestId('dropdown-connectors'));

    const expectedOptions = [
      { id: 'dropdown-connector-no-connector', text: 'No connector selected' },
      { id: 'dropdown-connector-servicenow-1', text: 'My SN connector' },
      { id: 'dropdown-connector-resilient-2', text: 'My Resilient connector' },
      { id: 'dropdown-connector-jira-1', text: 'Jira' },
      { id: 'dropdown-connector-servicenow-sir', text: 'My Connector SIR' },
      {
        id: 'dropdown-connector-servicenow-uses-table-api',
        text: 'My deprecated SN connector (deprecated)',
      },
    ];

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(expectedOptions.length);

    expectedOptions.forEach(({ id, text }, index) => {
      expect(options[index]).toHaveAttribute('data-test-subj', id);
      expect(options[index]).toHaveTextContent(text);
    });

    expect(
      within(options[5]).getByText('This connector is deprecated. Update it, or create a new one.')
    ).toBeInTheDocument();
  });

  test('it disables the dropdown', () => {
    renderWithTestingProviders(<ConnectorsDropdown {...props} disabled={true} />);

    expect(screen.getByTestId('dropdown-connectors')).toBeDisabled();
  });

  test('it loading correctly', () => {
    renderWithTestingProviders(<ConnectorsDropdown {...props} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('it does not show a loading indicator when not loading', () => {
    renderWithTestingProviders(<ConnectorsDropdown {...props} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('it selects the correct connector', () => {
    renderWithTestingProviders(
      <ConnectorsDropdown {...props} selectedConnector={'servicenow-1'} />
    );

    expect(screen.getByTestId('dropdown-connectors')).toHaveTextContent('My SN connector');
  });

  test('it does not throw when accessing the icon if the connector type is not registered', () => {
    expect(() =>
      renderWithTestingProviders(
        <ConnectorsDropdown
          {...props}
          connectors={[
            createMockActionConnector({
              id: 'none',
              actionTypeId: '.none',
              name: 'None',
            }),
          ]}
        />
      )
    ).not.toThrow();
  });

  test('it shows the deprecated tooltip when the connector is deprecated', () => {
    renderWithTestingProviders(
      <ConnectorsDropdown {...props} selectedConnector="servicenow-uses-table-api" />
    );

    const tooltips = screen.getAllByText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });

  test('it shows the deprecated tooltip when the connector is deprecated by configuration', () => {
    const connector = connectors[0];
    renderWithTestingProviders(
      <ConnectorsDropdown
        {...props}
        connectors={[
          {
            ...connector,
            isDeprecated: true,
          },
        ]}
        selectedConnector={connector.id}
      />
    );

    const tooltips = screen.getAllByText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });
});
