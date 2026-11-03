/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** Lets synchronous framework updates (e.g. React state flushes) settle before snapshotting. */
export const flushUpdates = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
