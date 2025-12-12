/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestionStatus } from '@kbn/search-connectors';

import { ingestionStatusToColor, ingestionStatusToText } from './ingestion_status_helpers';

describe('ingestionStatus helper functions', () => {
  describe('ingestionStatusToText', () => {
    it('should return connected for connected', () => {
      expect(ingestionStatusToText(IngestionStatus.CONNECTED)).toEqual('Connected');
    });
    it('should return error for error', () => {
      expect(ingestionStatusToText(IngestionStatus.ERROR)).toEqual('Connector failure');
    });
    it('should return error for sync error', () => {
      expect(ingestionStatusToText(IngestionStatus.SYNC_ERROR)).toEqual('Sync failure');
    });
    it('should return incomplete for other statuses', () => {
      expect(ingestionStatusToText(IngestionStatus.INCOMPLETE)).toEqual('Incomplete');
    });
  });
  describe('ingestionStatusToColor', () => {
    it('should return success for connected', () => {
      expect(ingestionStatusToColor(IngestionStatus.CONNECTED)).toEqual('success');
    });
    it('should return error for error', () => {
      expect(ingestionStatusToColor(IngestionStatus.ERROR)).toEqual('danger');
    });
    it('should return error for sync error', () => {
      expect(ingestionStatusToColor(IngestionStatus.SYNC_ERROR)).toEqual('danger');
    });
    it('should return warning for other statuses', () => {
      expect(ingestionStatusToColor(IngestionStatus.INCOMPLETE)).toEqual('warning');
    });
  });
});
