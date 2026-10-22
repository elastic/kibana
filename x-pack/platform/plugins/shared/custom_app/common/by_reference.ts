/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether a panel's state is a link to an app of the library: only such a state has a `ref_id`.
 * Shared by the server, which moves the id into the dashboard's references, and the browser,
 * which loads the app it names.
 */
export const isByReferenceState = <T extends object>(
  state: T
): state is Extract<T, { ref_id: string }> =>
  typeof (state as { ref_id?: unknown }).ref_id === 'string';
