/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../kibana_services', () => {
  return {
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
  };
});

import { setupSources } from './setup_sources';
import { SOURCE_TYPES } from '../../../common/constants';
import { getSourceByType } from './source_registry';

const EXPECTED_UNREGISTERED_SOURCE_TYPES = [
  SOURCE_TYPES.ES_ML_ANOMALIES, // registered in ML plugin
  // join sources are not contained in source registry
  SOURCE_TYPES.ES_DISTANCE_SOURCE,
  SOURCE_TYPES.ES_TERM_SOURCE,
  SOURCE_TYPES.TABLE_SOURCE,
];

test('should register all Elastic Maps sources', () => {
  setupSources();

  Object.values(SOURCE_TYPES)
    .filter((sourceType) => {
      return !EXPECTED_UNREGISTERED_SOURCE_TYPES.includes(sourceType);
    })
    .forEach((sourceType) => {
      const entry = getSourceByType(sourceType);
      if (!entry) {
        throw new Error(`Required source type "${sourceType}" not registered.`);
      }
    });
});
