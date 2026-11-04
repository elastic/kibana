/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { Storage } from '@kbn/kibana-utils-plugin/public';

const STORAGE_KEY = 'ml.discoverADManagement.selectedJobs';
// Bounds what is kept in the browser. The index patterns which had a job selected least recently are forgotten first.
const MAX_STORED_INDEX_PATTERNS = 20;

/** The id of the selected job, for each index pattern which has one. */
type SelectedJobs = Record<string, string>;

const isSelectedJobs = (value: unknown): value is SelectedJobs =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((jobId) => typeof jobId === 'string');

const readSelectedJobs = (): SelectedJobs => {
  try {
    const stored = new Storage(window.localStorage).get(STORAGE_KEY);
    return isSelectedJobs(stored) ? stored : {};
  } catch {
    return {};
  }
};

const writeSelectedJobs = (selectedJobs: SelectedJobs) => {
  try {
    new Storage(window.localStorage).set(STORAGE_KEY, selectedJobs);
  } catch {
    // The selection is kept for the page without the browser's storage
  }
};

const selectedJobIds = new Map<string, BehaviorSubject<string | undefined>>();

/**
 * The anomaly detection job which is selected for the index pattern, which is the one whose results
 * are shown on the Discover chart, or undefined when there is none. It is remembered by the browser.
 */
export const getSelectedJobId$ = (indexPattern: string): BehaviorSubject<string | undefined> => {
  const existing = selectedJobIds.get(indexPattern);
  if (existing) {
    return existing;
  }
  const selectedJobId$ = new BehaviorSubject<string | undefined>(readSelectedJobs()[indexPattern]);
  selectedJobIds.set(indexPattern, selectedJobId$);
  return selectedJobId$;
};

/** Selects the job for the index pattern, or no job when the id is undefined. */
export const setSelectedJobId = (indexPattern: string, jobId: string | undefined): void => {
  const { [indexPattern]: _previous, ...others } = readSelectedJobs();
  const selectedJobs = jobId ? { ...others, [indexPattern]: jobId } : others;
  writeSelectedJobs(
    Object.fromEntries(Object.entries(selectedJobs).slice(-MAX_STORED_INDEX_PATTERNS))
  );
  getSelectedJobId$(indexPattern).next(jobId);
};
