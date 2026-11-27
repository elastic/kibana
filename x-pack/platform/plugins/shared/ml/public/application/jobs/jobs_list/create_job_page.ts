/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { getIsMlEsqlDatafeedEnabled } from '../../services/ml_server_info';

/**
 * Returns the first page of anomaly detection job creation. The data source page offers ES|QL,
 * so it is skipped when Elasticsearch does not support ES|QL datafeeds.
 */
export const getCreateJobPage = () =>
  getIsMlEsqlDatafeedEnabled()
    ? ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_DATA_SOURCE
    : ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX;
