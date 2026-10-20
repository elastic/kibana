/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Joins the replica watch even when the task body throws. */

/** Stops and awaits the watch after `body`, including when `body` throws. */
export const guardReplicaWatch = async <T>(
  watch: Promise<unknown>,
  stop: () => void,
  body: () => Promise<T>
): Promise<T> => {
  try {
    return await body();
  } finally {
    stop();
    await watch;
  }
};
