/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { UNIT_METRICS_STREAM } from '../constants';

/**
 * Reads no rows. It fails with an unknown index error when the stream does not exist, which
 * ES|QL cannot tell from a stream the user cannot read.
 */
export const buildStreamProbeQuery = (): ComposerQuery =>
  esql.from(UNIT_METRICS_STREAM).pipe`LIMIT 0`;
