/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalyExplorerChartsService } from '../anomaly_explorer_charts_service';

export const createAnomalyExplorerChartsServiceMock = () =>
  ({
    getCombinedJobs: jest.fn(),
    getAnomalyData$: jest.fn(),
    setTimeRange: jest.fn(),
    getTimeBounds: jest.fn(),
    loadDataForCharts$: jest.fn(),
  } as unknown as jest.Mocked<AnomalyExplorerChartsService>);
