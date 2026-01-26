/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// createLoghubGenerator.test.ts
import { ToolingLog } from '@kbn/tooling-log';
import { createLoghubGenerator } from './create_loghub_generator';
import type { LoghubSystem } from './read_loghub_system_files';
import type { LoghubParser } from './types';

describe('createLoghubGenerator', () => {
  let system: LoghubSystem;
  let parser: LoghubParser;
  let log: ToolingLog;

  beforeEach(() => {
    parser = {
      getTimestamp: (line: string) => parseInt(line, 10),
      replaceTimestamp: (line: string, timestamp: number) => line,
      getFakeMetadata: () => ({}),
    };
  });

  describe('full speed', () => {
    beforeEach(() => {
      system = {
        name: 'TestSystem',
        readme: '',
        // 2rpm
        logLines: ['0', '60000'],
        templates: [],
      };
      log = new ToolingLog();
    });

    it('generates the first event at the start time', () => {
      const generator = createLoghubGenerator({ system, parser, log, streamType: 'wired' });
      const startTime = 100_000;
      const docs = generator.next(startTime);

      expect(docs).toHaveLength(1);

      expect(docs[0]['@timestamp']).toBe(startTime);
    });

    it('generates the second event with the right offset', () => {
      const generator = createLoghubGenerator({ system, parser, log, streamType: 'wired' });
      const startTime = 100_000;
      generator.next(startTime);

      const docs = generator.next(startTime + 60000);
      expect(docs).toHaveLength(1);
      expect(docs[0]['@timestamp']).toBe(startTime + 60000);
    });

    it('returns no events if current time is before the next event', () => {
      const generator = createLoghubGenerator({ system, parser, log, streamType: 'wired' });
      const startTime = 100_000;
      generator.next(startTime);

      const docs = generator.next(startTime + 60000 - 1);
      expect(docs).toHaveLength(0);
    });

    it('sets _index for classic stream type', () => {
      const classicGenerator = createLoghubGenerator({
        system,
        parser,
        log,
        streamType: 'classic',
      });

      const startTime = 200_000;
      const docs = classicGenerator.next(startTime);

      expect(docs).toHaveLength(1);
      expect(docs[0]._index).toBe(`logs-${system.name.toLowerCase()}-default`);
    });
  });

  describe('throttled', () => {
    beforeEach(() => {
      system = {
        name: 'TestSystem',
        readme: '',
        // 200rpm
        logLines: ['0', '599'],
        templates: [],
      };
      log = new ToolingLog();
    });

    it('applies speed throttle when log rate is too high', () => {
      const generator = createLoghubGenerator({
        system,
        parser,
        log,
        targetRpm: 100,
        streamType: 'wired',
      });

      const startTime = 100_000;
      const firstBatch = generator.next(startTime);

      expect(firstBatch).toHaveLength(1);
      // it starts at the usual time
      expect(firstBatch[0]['@timestamp']).toBe(startTime);

      // after that, the delta should be half of what is expected
      const secondBatch = generator.next(startTime + 1200);
      const expectedTimestamp = startTime + 1200;

      expect(secondBatch.length).toBe(1);

      expect(secondBatch[0]['@timestamp']).toBe(expectedTimestamp);
    });
  });
});
