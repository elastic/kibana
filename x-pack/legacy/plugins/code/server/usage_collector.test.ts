/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as usageCollector from './usage_collector';

describe('Code Usage Collector', () => {
  let makeUsageCollectorStub: any;
  let registerStub: any;
  let server: any;
  let callClusterStub: any;

  beforeEach(() => {
    makeUsageCollectorStub = jest.fn();
    registerStub = jest.fn();
    server = jest.fn().mockReturnValue({
      usage: {
        collectorSet: { makeUsageCollector: makeUsageCollectorStub, register: registerStub },
        register: {},
      },
    });
    callClusterStub = jest.fn().mockResolvedValue({
      persistent: {},
      transient: {
        logger: {
          deprecation: 'WARN',
        },
      },
    });
  });

  describe('initCodeUsageCollector', () => {
    it('should call collectorSet.register', () => {
      usageCollector.initCodeUsageCollector(server());
      expect(registerStub).toHaveBeenCalledTimes(1);
    });

    it('should call makeUsageCollector with type = code', () => {
      usageCollector.initCodeUsageCollector(server());
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('code');
    });

    it('should return correct stats', async () => {
      usageCollector.initCodeUsageCollector(server());
      const codeStats = await makeUsageCollectorStub.mock.calls[0][0].fetch(callClusterStub);
      expect(codeStats).toEqual({
        enabled: 1,
      });
    });
  });
});
