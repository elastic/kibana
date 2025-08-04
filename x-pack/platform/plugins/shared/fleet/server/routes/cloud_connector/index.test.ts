/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCloudConnectorHandler, getCloudConnectorsHandler } from './handlers';

describe('Cloud Connector Handlers', () => {
  describe('createCloudConnectorHandler', () => {
    it('should be defined', () => {
      expect(createCloudConnectorHandler).toBeDefined();
    });
  });

  describe('getCloudConnectorsHandler', () => {
    it('should be defined', () => {
      expect(getCloudConnectorsHandler).toBeDefined();
    });
  });
});
