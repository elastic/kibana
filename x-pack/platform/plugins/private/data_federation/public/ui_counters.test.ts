/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { createReportUiCounter, UI_COUNTER_APP_NAME, UI_COUNTER_EVENTS } from './ui_counters';

describe('createReportUiCounter', () => {
  describe('WHEN usageCollection is available', () => {
    it('SHOULD report a COUNT ui counter under the data federation app name', () => {
      const usageCollection = { reportUiCounter: jest.fn() };
      const reportUiCounter = createReportUiCounter(usageCollection);

      reportUiCounter(UI_COUNTER_EVENTS.datasetDelete, 3);

      expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
        UI_COUNTER_APP_NAME,
        METRIC_TYPE.COUNT,
        'dataset_delete',
        3
      );
    });
  });

  describe('WHEN usageCollection is unavailable', () => {
    it('SHOULD not throw', () => {
      const reportUiCounter = createReportUiCounter(undefined);

      expect(() => reportUiCounter(UI_COUNTER_EVENTS.datasourceCreate)).not.toThrow();
    });
  });
});
