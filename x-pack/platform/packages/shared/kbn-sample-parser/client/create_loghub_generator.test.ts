/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// createLoghubGenerator.test.ts
import { ToolingLog } from '@kbn/tooling-log';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { LoghubParser } from '../src/types';
import { createLoghubGenerator } from './create_loghub_generator';

describe('createLoghubGenerator', () => {
  let system: LoghubSystem;
  let parser: LoghubParser;
  let log: ToolingLog;

  beforeEach(() => {
    parser = {
      getTimestamp: (line: string) => parseInt(line, 10),
      replaceTimestamp: (line: string, timestamp: number) => line,
    };
  });

  describe('full speed', () => {
    beforeEach(() => {
      system = {
        name: 'TestSystem',
        readme: '',
        // 2rpm
        logLines: ['0', '60000'],
      };
      log = new ToolingLog();
    });

    it('generates the first event at the start time', () => {
      const generator = createLoghubGenerator({ system, parser, log });
      const startTime = 100_000;
      const docs = generator.next(startTime);

      expect(docs).toHaveLength(1);

      expect(docs[0]['@timestamp']).toBe(startTime);
    });

    it('generates the second event with the right offset', () => {
      const generator = createLoghubGenerator({ system, parser, log });
      const startTime = 100_000;
      generator.next(startTime);

      const docs = generator.next(startTime + 60000);
      expect(docs).toHaveLength(1);
      expect(docs[0]['@timestamp']).toBe(startTime + 60000);
    });

    it('returns no events if current time is before the next event', () => {
      const generator = createLoghubGenerator({ system, parser, log });
      const startTime = 100_000;
      generator.next(startTime);

      const docs = generator.next(startTime + 60000 - 1);
      expect(docs).toHaveLength(0);
    });
  });

  describe('throttled', () => {
    beforeEach(() => {
      system = {
        name: 'TestSystem',
        readme: '',
        // 200rpm
        logLines: ['0', '600'],
      };
      log = new ToolingLog();
    });

    test('applies speed throttle when log rate is too high', () => {
      const generator = createLoghubGenerator({ system, parser, log, targetRpm: 100 });

      const startTime = 100_000;
      const firstBatch = generator.next(startTime);

      expect(firstBatch).toHaveLength(1);
      // it starts at the usual time
      expect(firstBatch[0]['@timestamp']).toBe(startTime);

      // after that, the delta should be half of what is expected
      const secondBatch = generator.next(startTime + 600);
      const expectedTimestamp = startTime + 300;

      expect(secondBatch.length).toBeGreaterThanOrEqual(1);

      expect(secondBatch[0]['@timestamp']).toBe(expectedTimestamp);
    });
  });
});
