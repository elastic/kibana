/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexWorkerService } from './regex_worker_service';
import { createPiiDetectionContext } from './create_pii_detection_context';

describe('createPiiDetectionContext', () => {
  it('delegates enabled regex detection to the worker and maps record IDs', async () => {
    const run = jest.fn().mockResolvedValue([
      {
        recordIndex: 0,
        recordKey: 'message-1',
        start: 8,
        end: 24,
        matchValue: 'user@example.com',
        class_name: 'EMAIL',
        ruleIndex: 0,
      },
    ]);
    const context = createPiiDetectionContext({
      regexWorker: { run } as unknown as RegexWorkerService,
    });

    await expect(
      context.detectEntities({
        records: [{ id: 'message-1', text: 'Contact user@example.com' }],
        rules: [
          { type: 'RegExp', enabled: true, pattern: '[^ ]+@[^ ]+', entityClass: 'EMAIL' },
          { type: 'RegExp', enabled: false, pattern: 'ignored', entityClass: 'MISC' },
          { type: 'NER', enabled: false },
        ],
      })
    ).resolves.toEqual([
      {
        recordId: 'message-1',
        start: 8,
        end: 24,
        value: 'user@example.com',
        entityClass: 'EMAIL',
      },
    ]);

    expect(run).toHaveBeenCalledWith({
      rules: [{ type: 'RegExp', enabled: true, pattern: '[^ ]+@[^ ]+', entityClass: 'EMAIL' }],
      records: [{ 'message-1': 'Contact user@example.com' }],
    });
  });

  it('does not invoke the worker when there are no enabled regex rules', async () => {
    const run = jest.fn();
    const context = createPiiDetectionContext({
      regexWorker: { run } as unknown as RegexWorkerService,
    });

    await expect(
      context.detectEntities({
        records: [{ id: 'message-1', text: 'some text' }],
        rules: [{ type: 'NER', enabled: false }],
      })
    ).resolves.toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects enabled NER rules instead of silently ignoring them', async () => {
    const run = jest.fn();
    const context = createPiiDetectionContext({
      regexWorker: { run } as unknown as RegexWorkerService,
    });

    await expect(
      context.detectEntities({
        records: [{ id: 'message-1', text: 'some text' }],
        rules: [{ type: 'NER', enabled: true }],
      })
    ).rejects.toThrow('NER detection is not supported by workflow-driven anonymization');
    expect(run).not.toHaveBeenCalled();
  });

  it('honors cancellation before dispatching worker work', async () => {
    const run = jest.fn();
    const context = createPiiDetectionContext({
      regexWorker: { run } as unknown as RegexWorkerService,
    });
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      context.detectEntities({
        records: [{ id: 'message-1', text: 'some text' }],
        rules: [{ type: 'RegExp', enabled: true, pattern: 'text', entityClass: 'MISC' }],
        abortSignal: abortController.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(run).not.toHaveBeenCalled();
  });

  it('honors cancellation while worker work is in flight', async () => {
    let resolveRun: ((matches: []) => void) | undefined;
    const run = jest.fn(
      () =>
        new Promise<[]>((resolve) => {
          resolveRun = resolve;
        })
    );
    const context = createPiiDetectionContext({
      regexWorker: { run } as unknown as RegexWorkerService,
    });
    const abortController = new AbortController();

    const detection = context.detectEntities({
      records: [{ id: 'message-1', text: 'some text' }],
      rules: [{ type: 'RegExp', enabled: true, pattern: 'text', entityClass: 'MISC' }],
      abortSignal: abortController.signal,
    });

    expect(run).toHaveBeenCalledTimes(1);
    abortController.abort();
    if (!resolveRun) {
      throw new Error('Expected regex worker invocation');
    }
    resolveRun([]);

    await expect(detection).rejects.toMatchObject({ name: 'AbortError' });
  });
});
