/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { DatasetFilter } from './filter_dataset';

const renderComponent = (props: React.ComponentProps<typeof DatasetFilter>) => {
  return render(
    <IntlProvider locale="en">
      <DatasetFilter {...props} />
    </IntlProvider>
  );
};

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    data: {
      dataViews: {
        getFieldsForWildcard: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue([]),
      },
    },
    unifiedSearch: {
      autocomplete: {
        getValueSuggestions: jest
          .fn()
          .mockResolvedValue([
            'elastic_agent',
            'elastic_agent.filebeat',
            'elastic_agent.fleet_server',
            'elastic_agent.metricbeat',
          ]),
      },
    },
  }),
}));

describe('DatasetFilter', () => {
  const { getByRole, getByText } = renderComponent({
    selectedDatasets: [],
    onToggleDataset: () => {},
  });

  it('Renders all statuses', () => {
    act(() => {
      fireEvent.click(getByRole('button'));
    });

    expect(getByText('elastic_agent')).toBeInTheDocument();
    expect(getByText('elastic_agent.filebeat')).toBeInTheDocument();
    expect(getByText('elastic_agent.fleet_server')).toBeInTheDocument();
    expect(getByText('elastic_agent.metricbeat')).toBeInTheDocument();
  });
});
