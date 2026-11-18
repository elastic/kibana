/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { filterImports, ImportsTable } from './imports_table';

const mockGetUrlForApp = jest.fn(
  (_appId: string, { path }: { deepLinkId: string; path: string }) =>
    `/app/management/insightsAndAlerting/triggersActionsConnectors${path}`
);

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ getUrlForApp: mockGetUrlForApp }),
}));

describe('ImportsTable', () => {
  it('links the Manage action of an import to its connector', async () => {
    render(
      <I18nProvider>
        <ImportsTable
          isLoading={false}
          items={[
            { connectorId: 'connector/1', name: 'Datadog one', connectorTypeId: '.datadog' },
          ]}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('importActionsButton-connector/1'));
    const manage = await screen.findByTestId('importsManageAction');

    expect(manage.getAttribute('href')).toBe(
      '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/connector%2F1'
    );
    expect(manage.getAttribute('target')).toBe('_blank');
    expect(mockGetUrlForApp).toHaveBeenCalledWith('management', {
      deepLinkId: 'triggersActionsConnectors',
      path: '/connectors/connector%2F1',
    });
  });
});

describe('filterImports', () => {
  const items = [
    { connectorId: '1', name: 'Production', connectorTypeId: '.datadog' },
    { connectorId: '2', name: 'Payments Datadog', connectorTypeId: '.other' },
    { connectorId: '3', name: 'Infra', connectorTypeId: '.other' },
  ];

  it('returns every import for an empty search', () => {
    expect(filterImports(items, '  ')).toEqual(items);
  });

  it('matches the name, case-insensitively', () => {
    expect(filterImports(items, 'INFRA')).toEqual([items[2]]);
  });

  it('matches the type label as well as the name', () => {
    expect(filterImports(items, 'datadog')).toEqual([items[0], items[1]]);
  });

  it('matches the connector type id when the type has no label', () => {
    expect(filterImports(items, '.other')).toEqual([items[1], items[2]]);
  });
});
