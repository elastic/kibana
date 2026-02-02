/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ConnectorTypes } from '../../../common/types/domain';
import { ConnectorCard } from './card';
import { tableMatchesExpectedContent } from '../../common/test_utils';

describe('ConnectorCard ', () => {
  it('does not throw when accessing the icon if the connector type is not registered', () => {
    expect(() =>
      render(
        <ConnectorCard
          connectorType={ConnectorTypes.none}
          title="None"
          listItems={[]}
          isLoading={false}
        />
      )
    ).not.toThrowError();
  });

  it('shows the loading skeleton if loading', () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="None"
        listItems={[]}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('connector-card-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-card')).not.toBeInTheDocument();
  });

  it('shows the connector title', () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('My connector')).toBeInTheDocument();
  });

  it('shows the connector list items', () => {
    const listItems = [
      { title: 'item 1 title', description: 'item 1 desc' },
      { title: 'item 2 title', description: 'item 2 desc' },
    ];

    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={listItems}
        isLoading={false}
      />
    );

    const rows = screen.getAllByTestId('card-list-item-row');
    const expectedContent = listItems.map((item) => [item.title, item.description]);

    tableMatchesExpectedContent({ expectedContent, tableRows: rows });
  });

  it('does not throw for unexpected values', () => {
    const listItems = [
      { title: 'item 1 title', description: { testing: true } },
      { title: 'item 2 title', description: ['item 2 desc'] },
      { title: 'item 3 title', description: true },
      { title: 'item 4 title', description: null },
    ];

    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        // @ts-expect-error testing unexpected values
        // since the values come from third-party services
        // it's better to check for unexpected values as well
        listItems={listItems}
        isLoading={false}
      />
    );

    const rows = screen.getAllByTestId('card-list-item-row');
    const expectedContent = [
      ['item 1 title', '{"testing":true}'],
      ['item 2 title', 'item 2 desc'],
      ['item 3 title', 'true'],
      ['item 4 title', 'null'],
    ];

    tableMatchesExpectedContent({ expectedContent, tableRows: rows });
  });
});
