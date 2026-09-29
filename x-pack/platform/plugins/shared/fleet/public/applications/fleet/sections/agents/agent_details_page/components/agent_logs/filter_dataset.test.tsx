/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { DatasetFilter } from './filter_dataset';
import userEvent from '@testing-library/user-event';

const renderComponent = (props: React.ComponentProps<typeof DatasetFilter>) => {
  return render(
    <IntlProvider locale="en">
      <DatasetFilter {...props} />
    </IntlProvider>
  );
};

vi.mock('../../../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../../hooks')),
    useStartServices: vi.fn().mockReturnValue({
      data: {
        dataViews: {
          getFieldsForWildcard: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue([]),
        },
      },
      kql: {
        autocomplete: {
          getValueSuggestions: vi
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
  };
  return { ...mocked, default: mocked };
});

describe('DatasetFilter', () => {
  const { getByRole, getByText } = renderComponent({
    selectedDatasets: [],
    onToggleDataset: () => {},
  });

  it('Renders all statuses', async () => {
    await userEvent.click(getByRole('button'));

    expect(getByText('elastic_agent')).toBeInTheDocument();
    expect(getByText('elastic_agent.filebeat')).toBeInTheDocument();
    expect(getByText('elastic_agent.fleet_server')).toBeInTheDocument();
    expect(getByText('elastic_agent.metricbeat')).toBeInTheDocument();
  });
});
