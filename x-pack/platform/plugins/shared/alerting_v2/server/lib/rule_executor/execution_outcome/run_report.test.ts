/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunReport, tagRunReport } from './run_report';

const report = { ruleVersion: 3, counters: { signalsGenerated: 2 } };

describe('tagRunReport', () => {
  it('returns the same error instance rather than wrapping it', () => {
    const error = new Error('boom');

    expect(tagRunReport(error, report)).toBe(error);
  });

  it('carries the report through to the reader', () => {
    expect(getRunReport(tagRunReport(new Error('boom'), report))).toEqual(report);
  });

  it('keeps the first report, so the innermost catch wins', () => {
    const error = tagRunReport(new Error('boom'), report);

    tagRunReport(error, { ruleVersion: 99, counters: {} });

    expect(getRunReport(error)).toEqual(report);
  });

  it('leaves a non-Error throw untouched', () => {
    expect(tagRunReport('boom', report)).toBe('boom');
    expect(getRunReport('boom')).toBeUndefined();
  });

  it('returns undefined for an untagged error', () => {
    expect(getRunReport(new Error('boom'))).toBeUndefined();
  });

  describe('serialization', () => {
    const error = tagRunReport(new Error('boom'), report);

    it('stays out of JSON.stringify and Object.keys', () => {
      expect(JSON.stringify(error)).not.toContain('ruleVersion');
      expect(Object.keys(error)).toEqual([]);
    });

    it('leaves the message and stack that Task Manager actually logs intact', () => {
      expect(String(error)).toBe('Error: boom');
      expect(error.stack).toContain('boom');
    });
  });
});
