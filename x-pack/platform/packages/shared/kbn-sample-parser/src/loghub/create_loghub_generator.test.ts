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

  describe('uniform_interval', () => {
    beforeEach(() => {
      system = {
        name: 'DenseTimestamps',
        readme: '',
        logLines: ['0', '1', '2', '3'],
        templates: [],
      };
      log = new ToolingLog();
    });

    it('spaces documents by targetRpm instead of source timestamp density', () => {
      const generator = createLoghubGenerator({
        system,
        parser,
        log,
        targetRpm: 120,
        streamType: 'wired',
        timestampLayout: 'uniform_interval',
      });

      const startTime = 1_000_000;
      expect(generator.next(startTime)).toHaveLength(1);
      expect(generator.next(startTime + 499)).toHaveLength(0);

      const secondBatch = generator.next(startTime + 500);
      expect(secondBatch).toHaveLength(1);
      expect(secondBatch[0]['@timestamp']).toBe(startTime + 500);
    });
  });

  describe('function-based metadataOverride', () => {
    beforeEach(() => {
      system = {
        name: 'TestSystem',
        readme: '',
        logLines: ['0', '60000'],
        templates: [],
      };
      log = new ToolingLog();
    });

    it('invokes function override per document with docIndex and logLine', () => {
      const calls: Array<{ docIndex: number; logLine: string }> = [];
      const generator = createLoghubGenerator({
        system,
        parser,
        log,
        streamType: 'wired',
        metadataOverride: (docIndex, logLine) => {
          calls.push({ docIndex, logLine });
          return { 'custom.tag': `doc-${docIndex}` };
        },
      });

      const startTime = 100_000;
      const firstDoc = generator.next(startTime);
      expect(firstDoc).toHaveLength(1);
      expect(firstDoc[0]['custom.tag']).toBe('doc-0');
      expect(calls).toHaveLength(1);
      expect(calls[0].docIndex).toBe(0);

      const secondDoc = generator.next(startTime + 60000);
      expect(secondDoc).toHaveLength(1);
      expect(secondDoc[0]['custom.tag']).toBe('doc-1');
      expect(calls).toHaveLength(2);
      expect(calls[1].docIndex).toBe(1);
    });

    it('produces different metadata per document with function override (uniform_interval)', () => {
      let counter = 0;
      const generator = createLoghubGenerator({
        system: { ...system, logLines: ['0', '1', '2', '3'] },
        parser,
        log,
        targetRpm: 120,
        streamType: 'wired',
        timestampLayout: 'uniform_interval',
        metadataOverride: () => ({ 'noise.field': `val-${counter++}` }),
      });

      const startTime = 1_000_000;
      const batch1 = generator.next(startTime);
      const batch2 = generator.next(startTime + 500);

      expect(batch1[0]['noise.field']).toBe('val-0');
      expect(batch2[0]['noise.field']).toBe('val-1');
    });
  });
});
