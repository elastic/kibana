/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isPipelineMonitoringSupportedInVersion } from '../pipelines';

describe('pipelines', () => {
  describe('isPipelineMonitoringSupportedInVersion', () => {
    it('returns false if lower major version than supported version is supplied', () => {
      const logstashVersion = '5.7.1';
      expect(isPipelineMonitoringSupportedInVersion(logstashVersion)).to.be(false);
    });

    it('returns true if exact major version as supported version is supplied', () => {
      const logstashVersion = '6.1.0';
      expect(isPipelineMonitoringSupportedInVersion(logstashVersion)).to.be(true);
    });

    it('returns true if higher major version than supported version is supplied', () => {
      const logstashVersion = '7.0.2';
      expect(isPipelineMonitoringSupportedInVersion(logstashVersion)).to.be(true);
    });
  });
});
