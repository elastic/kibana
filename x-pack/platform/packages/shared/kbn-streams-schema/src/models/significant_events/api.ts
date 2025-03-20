/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamQueryKql } from '../base/api';

/**
 * SignificantEvents Get Response
 */

type SignificantEventsResponse = StreamQueryKql & {
  occurrences: Array<{ date: string; count: number }>;
};

type SignificantEventsGetResponse = SignificantEventsResponse[];

export type { SignificantEventsResponse, SignificantEventsGetResponse };
