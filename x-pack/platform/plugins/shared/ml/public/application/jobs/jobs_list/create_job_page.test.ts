/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { getIsMlEsqlDatafeedEnabled } from '../../services/ml_server_info';
import { getCreateJobPage } from './create_job_page';

jest.mock('../../services/ml_server_info', () => ({
  getIsMlEsqlDatafeedEnabled: jest.fn(),
}));

const mockGetIsMlEsqlDatafeedEnabled = getIsMlEsqlDatafeedEnabled as jest.Mock;

describe('getCreateJobPage', () => {
  it('starts at the data source page when ES|QL datafeeds are supported', () => {
    mockGetIsMlEsqlDatafeedEnabled.mockReturnValue(true);

    expect(getCreateJobPage()).toBe(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_DATA_SOURCE);
  });

  it('starts at the data view page when ES|QL datafeeds are not supported', () => {
    mockGetIsMlEsqlDatafeedEnabled.mockReturnValue(false);

    expect(getCreateJobPage()).toBe(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX);
  });
});
