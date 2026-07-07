/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ValidateJob } from './validate_job_view';

const mockValidateJob = jest.fn().mockImplementation(({ job }) => {
  console.log('job', job);
  if (job.job_id === 'job1') {
    return Promise.resolve([]);
  } else if (job.job_id === 'job2') {
    return Promise.resolve([
      {
        fieldName: 'airline',
        id: 'over_field_low_cardinality',
        status: 'warning',
        text: 'Cardinality of over_field "airline" is low and therefore less suitable for population analysis.',
        url: 'https://www.elastic.co/blog/sizing-machine-learning-with-elasticsearch',
      },
    ]);
  } else {
    return Promise.reject(new Error('Unknown job'));
  }
});

const mockKibanaContext = {
  services: {
    docLinks: { links: { ml: { anomalyDetectionJobTips: 'https://anomalyDetectionJobTips' } } },
    notifications: { toasts: { addDanger: jest.fn(), addError: jest.fn() } },
    mlServices: { mlApi: { validateJob: mockValidateJob } },
  },
};

const mockReact = React;
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaContext,
      });
    };
    return EnhancedType;
  },
}));

const job = {
  job_id: 'job2',
};

const getJobConfig = () => job;
const getDuration = () => ({ start: 0, end: 1 });

describe('ValidateJob', () => {
  test('renders the button when not in embedded mode', () => {
    const { getByTestId, queryByTestId } = render(
      <IntlProvider>
        <ValidateJob
          isDisabled={false}
          embedded={false}
          getDuration={getDuration}
          getJobConfig={getJobConfig}
        />
      </IntlProvider>
    );

    const button = getByTestId('mlValidateJobButton');
    expect(button).toBeInTheDocument();

    const loadingSpinner = queryByTestId('mlValidateJobLoadingSpinner');
    expect(loadingSpinner).not.toBeInTheDocument();
    const modal = queryByTestId('mlValidateJobModal');
    expect(modal).not.toBeInTheDocument();
  });

  test('renders no button when in embedded mode', async () => {
    const { queryByTestId, getByTestId } = render(
      <IntlProvider>
        <ValidateJob
          isDisabled={false}
          embedded={true}
          getDuration={getDuration}
          getJobConfig={getJobConfig}
        />
      </IntlProvider>
    );

    expect(queryByTestId('mlValidateJobButton')).not.toBeInTheDocument();
    expect(getByTestId('mlValidateJobLoadingSpinner')).toBeInTheDocument();
    expect(queryByTestId('mlValidateJobModal')).not.toBeInTheDocument();

    await waitFor(() => expect(mockValidateJob).toHaveBeenCalledTimes(1));

    // wait for the loading spinner to disappear and show a callout instead
    await waitFor(() => {
      expect(queryByTestId('mlValidateJobLoadingSpinner')).not.toBeInTheDocument();
      expect(queryByTestId('mlValidationCallout warning')).toBeInTheDocument();
    });
  });
});
