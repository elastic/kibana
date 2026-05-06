/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

/**
 * The "envelope" — fields every cases-data document carries, regardless of surface.
 * These names are the contract surface that the `kibana-cases-security` ES plugin's
 * implicit-privileges provider matches against to derive DLS. Do not rename without
 * coordinating with the ES side.
 */
export const ENVELOPE_PROPERTIES: Record<string, MappingProperty> = {
  '@timestamp': { type: 'date' },
  kibana: {
    properties: {
      space_ids: { type: 'keyword' },
    },
  },
  cases: {
    properties: {
      owner: { type: 'keyword' },
      id: { type: 'keyword' },
    },
  },
};
