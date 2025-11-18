/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDatasetAction } from './describe_dataset_action';
import { chatStreamAction } from './chat_stream_action';
import type { StreamMenuItem } from '../types';

// Legacy actions retained (describe + chat). Workflows will be assembled elsewhere.
export const STREAM_ACTION_ITEMS: StreamMenuItem[] = [
  { kind: 'action', action: describeDatasetAction },
  { kind: 'action', action: chatStreamAction },
];

export type { StreamAction } from '../types';
