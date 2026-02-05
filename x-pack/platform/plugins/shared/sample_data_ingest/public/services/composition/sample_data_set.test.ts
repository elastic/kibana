/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { createSampleDataSet } from './sample_data_set';
import { InstallationStatus, type StatusResponse } from '../../../common';

describe('createSampleDataSet', () => {
  it('composes the sample data set from a status response', () => {
    const basePath = '/test-base-path';
    const http = httpServiceMock.createStartContract({ basePath });

    const statusResponse: StatusResponse = {
      status: InstallationStatus.Installed,
      indexName: 'elasticsearch-docs',
      dashboardId: 'custom-dashboard-id',
    };

    const expected: SampleDataSet = {
      id: 'elasticsearch_documentation',
      name: 'Elasticsearch Documentation',
      description:
        'Sample data from Elasticsearch documentation to help you explore search capabilities.',
      previewImagePath: `${basePath}/plugins/sampleDataIngest/assets/search_results_illustration.svg`,
      darkPreviewImagePath: `${basePath}/plugins/sampleDataIngest/assets/search_results_illustration.svg`,
      overviewDashboard: 'custom-dashboard-id',
      defaultIndex: '0e5a8704-b6fa-4320-9b73-65f692379500',
      appLinks: [],
      status: 'installed',
      statusMsg: undefined,
    };

    const result = createSampleDataSet(statusResponse, http);

    expect(result).toEqual(expected);
  });
});
