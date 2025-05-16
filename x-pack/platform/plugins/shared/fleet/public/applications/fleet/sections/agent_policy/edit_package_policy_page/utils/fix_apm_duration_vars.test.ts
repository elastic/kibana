/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fixApmDurationVars } from './fix_apm_duration_vars';

describe('Edit Package Policy - fixApmDurationVars()', () => {
  const mockApmVars = {
    idle_timeout: {
      type: 'text',
      value: '45',
    },
    read_timeout: {
      type: 'text',
      value: '3600',
    },
    shutdown_timeout: {
      type: 'text',
      value: '30s',
    },
    max_header_bytes: {
      type: 'integer',
      value: 3,
    },
    url: {
      type: 'text',
      value: 'http://localhost:8200',
    },
  };
  describe('when the APM var is a duration var', () => {
    it('adds duration unit suffix to APM duration vars ', () => {
      const newVars = fixApmDurationVars(mockApmVars);
      expect(newVars.idle_timeout.value).toEqual('45s');
    });
    it('doesnt add the suffix if doesnt end with number', () => {
      const newVars = fixApmDurationVars(mockApmVars);
      expect(newVars.shutdown_timeout.value).toEqual(mockApmVars.shutdown_timeout.value);
    });
  });
  describe('when the APM is not a duration var', () => {
    it('keeps the same value', () => {
      const newVars = fixApmDurationVars(mockApmVars);
      expect(newVars.url.value).toEqual(mockApmVars.url.value);
      expect(newVars.max_header_bytes.value).toEqual(mockApmVars.max_header_bytes.value);
    });
  });
});
