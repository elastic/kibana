/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type-level assertions about the throttle union, checked by `tsc`. The `.test-d.ts` suffix keeps
 * the file out of the `*.test.ts` pattern Jest matches: every assertion here either compiles or
 * fails the type check, so there is nothing to run.
 *
 * Accepting `{}` on a patch would widen the inferred type to `Throttle | {}`, and TypeScript's `{}`
 * matches all but `null` and `undefined` — the whole union would stop catching anything.
 */

import type { UpdateActionPolicyData } from './action_policy_data_schema';

type PatchableThrottle = UpdateActionPolicyData['throttle'];

const accepts = (_throttle: PatchableThrottle): void => {};

accepts({ strategy: 'on_status_change' });
accepts({ strategy: 'every_time' });
accepts({ strategy: 'time_interval', interval: '5m' });
accepts({ strategy: 'per_status_interval', interval: '5m' });
accepts(null);
accepts(undefined);

// @ts-expect-error a throttle is replaced whole, so `{}` names no variant rather than no change.
accepts({});

// @ts-expect-error `every_time` notifies on every cycle, so an interval is not one of its keys.
accepts({ strategy: 'every_time', interval: '5m' });

// @ts-expect-error `time_interval` notifies on a schedule, so its interval is required.
accepts({ strategy: 'time_interval' });

// @ts-expect-error a patch cannot name one key of a variant; it sends the whole variant.
accepts({ interval: '10m' });
