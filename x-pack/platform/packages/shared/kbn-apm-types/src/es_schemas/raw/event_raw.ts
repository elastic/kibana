/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMBaseDoc } from './apm_base_doc';
import { TimestampUs } from './fields/timestamp_us';

export interface EventRaw extends APMBaseDoc {
  timestamp: TimestampUs;
  transaction?: {
    id: string;
    sampled?: boolean;
    type: string;
  };
  log: {
    message?: string;
  };
  event: {
    action: string;
    category: string;
  };
}
