/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs tasks strictly one at a time, in submission order.
 */
export interface PageScheduler {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export const createPageScheduler = (): PageScheduler => {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(() => task());
      // a failed task must not stall the queue
      tail = result.catch(() => undefined);
      return result;
    },
  };
};

let pageScheduler: PageScheduler | undefined;

/**
 * Returns the scheduler shared by every conversation surface on the page,
 * so browser tool handlers never run concurrently.
 */
export const getPageScheduler = (): PageScheduler => {
  if (!pageScheduler) {
    pageScheduler = createPageScheduler();
  }
  return pageScheduler;
};
