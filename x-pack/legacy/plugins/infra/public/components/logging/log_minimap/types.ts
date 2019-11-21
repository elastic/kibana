/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeKey } from '../../../../common/time';

export interface SummaryBucket {
  start: number;
  end: number;
  entriesCount: number;
}

export interface SummaryHighlightBucket extends SummaryBucket {
  representativeKey: TimeKey;
}
