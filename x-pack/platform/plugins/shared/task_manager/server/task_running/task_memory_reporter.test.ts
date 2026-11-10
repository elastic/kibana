/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRunMemoryReporter, NOOP_RUN_MEMORY_REPORTER } from './task_memory_reporter';

describe('createRunMemoryReporter', () => {
  it('keeps the peak of the reports and the latest reservation', () => {
    const run = createRunMemoryReporter();
    expect(run.peakReportedBytes()).toBeUndefined();
    expect(run.reservedBytes()).toBe(0);

    run.reporter.report(30);
    run.reporter.report(70);
    run.reporter.report(50);
    run.reporter.reserve(100);
    run.reporter.reserve(40);
    expect(run.peakReportedBytes()).toBe(70);
    expect(run.reservedBytes()).toBe(40);

    run.reporter.release();
    expect(run.reservedBytes()).toBe(0);
  });

  it('ignores invalid values', () => {
    const run = createRunMemoryReporter();
    run.reporter.report(-1);
    run.reporter.report(Number.NaN);
    run.reporter.reserve(Number.POSITIVE_INFINITY);
    expect(run.peakReportedBytes()).toBeUndefined();
    expect(run.reservedBytes()).toBe(0);
  });

  it('ignores every call once closed', () => {
    const run = createRunMemoryReporter();
    run.reporter.report(10);
    run.reporter.reserve(20);
    run.close();
    run.reporter.report(100);
    run.reporter.reserve(200);
    expect(run.peakReportedBytes()).toBe(10);
    expect(run.reservedBytes()).toBe(0);
  });
});

describe('NOOP_RUN_MEMORY_REPORTER', () => {
  it('records nothing', () => {
    NOOP_RUN_MEMORY_REPORTER.reporter.report(10);
    NOOP_RUN_MEMORY_REPORTER.reporter.reserve(20);
    expect(NOOP_RUN_MEMORY_REPORTER.peakReportedBytes()).toBeUndefined();
    expect(NOOP_RUN_MEMORY_REPORTER.reservedBytes()).toBe(0);
  });
});
