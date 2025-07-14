/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitiesIndexPattern, entitiesAliasPattern } from './patterns';

describe('index/alias pattern helpers', () => {
  describe('entitiesIndexPattern', () => {
    it('generates a index pattern', () => {
      expect(
        entitiesIndexPattern({
          definitionId: 'my-definition',
          schemaVersion: 'v1',
          dataset: 'latest',
        })
      ).toEqual('.entities.v1.latest.my-definition');
    });
  });

  describe('entitiesAliasPattern', () => {
    it('generates a alias pattern', () => {
      expect(
        entitiesAliasPattern({
          type: 'service',
          dataset: 'latest',
        })
      ).toEqual('entities-service-latest');
    });
  });
});
