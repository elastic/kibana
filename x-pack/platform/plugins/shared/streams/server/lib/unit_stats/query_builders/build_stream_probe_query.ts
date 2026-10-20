/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { UNIT_METRICS_STREAM } from '../constants';

/**
 * Returns no rows, and no columns when the stream does not exist. The wildcard makes a missing
 * stream an empty result: `TS` and `FROM` on the exact name fail with an unknown index error,
 * which cannot be told from a 403.
 */
export const buildStreamProbeQuery = (): ComposerQuery =>
  esql.from(`${UNIT_METRICS_STREAM}*`).pipe`LIMIT 0`;
