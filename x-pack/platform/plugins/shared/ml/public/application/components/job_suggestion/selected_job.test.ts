/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSelectedJobId$,
  getShowAnomalies$,
  setSelectedJobId,
  setShowAnomalies,
} from './selected_job';

const STORAGE_KEY = 'ml.discoverADManagement.selectedJobs';

const getStored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');

// Each test uses its own index patterns, as the selected jobs are also kept in memory
describe('selected job', () => {
  beforeEach(() => window.localStorage.clear());

  it('has no job selected by default', () => {
    expect(getSelectedJobId$('none-*').getValue()).toBeUndefined();
  });

  it('emits the selected job, and no job when it is deselected', () => {
    const emitted: Array<string | undefined> = [];
    getSelectedJobId$('emit-*').subscribe((jobId) => emitted.push(jobId));

    setSelectedJobId('emit-*', 'job-1');
    setSelectedJobId('emit-*', undefined);

    expect(emitted).toEqual([undefined, 'job-1', undefined]);
  });

  it('keeps a selected job for each index pattern', () => {
    setSelectedJobId('a-*', 'job-a');
    setSelectedJobId('b-*', 'job-b');

    expect(getSelectedJobId$('a-*').getValue()).toBe('job-a');
    expect(getSelectedJobId$('b-*').getValue()).toBe('job-b');
  });

  it('remembers the selected job in the browser, and forgets it when deselected', () => {
    setSelectedJobId('stored-*', 'job-1');
    expect(getStored()).toEqual({ 'stored-*': 'job-1' });

    setSelectedJobId('stored-*', undefined);
    expect(getStored()).toEqual({});
  });

  it('is the job which was remembered by the browser', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'remembered-*': 'job-1' }));
    expect(getSelectedJobId$('remembered-*').getValue()).toBe('job-1');
  });

  it('ignores what the browser remembers when it is not job ids', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'invalid-*': 1 }));
    expect(getSelectedJobId$('invalid-*').getValue()).toBeUndefined();
  });

  it('forgets the index patterns which had a job selected least recently', () => {
    Array.from({ length: 22 }, (_, index) => setSelectedJobId(`many-${index}-*`, `job-${index}`));

    const stored = getStored();
    expect(Object.keys(stored)).toHaveLength(20);
    expect(stored['many-0-*']).toBeUndefined();
    expect(stored['many-21-*']).toBe('job-21');
  });
});

describe('show anomalies', () => {
  const KEY = 'ml.discoverADManagement.showAnomalies';
  beforeEach(() => window.localStorage.clear());

  it('shows the anomalies by default', () => {
    expect(getShowAnomalies$('show-default-*').getValue()).toBe(true);
  });

  it('emits the change, and remembers only when they are hidden', () => {
    const emitted: boolean[] = [];
    getShowAnomalies$('show-emit-*').subscribe((show) => emitted.push(show));

    setShowAnomalies('show-emit-*', false);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).toEqual({ 'show-emit-*': true });

    setShowAnomalies('show-emit-*', true);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).toEqual({});
    expect(emitted).toEqual([true, false, true]);
  });

  it('is kept for each index pattern', () => {
    setShowAnomalies('show-a-*', false);
    expect(getShowAnomalies$('show-a-*').getValue()).toBe(false);
    expect(getShowAnomalies$('show-b-*').getValue()).toBe(true);
  });
});
