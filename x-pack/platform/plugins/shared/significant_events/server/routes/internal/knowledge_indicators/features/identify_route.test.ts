/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
} from '../../../../lib/significant_events/features';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

const route =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/inferred'
  ];

const createParams = (documents: Array<{ _id: string; fields: Record<string, unknown> }>) => ({
  path: { streamName: 'logs.test' },
  body: {
    documents,
    totalFilters: 0,
    filtersCapped: false,
    hasFilteredDocuments: false,
  },
});

describe('identifyInferredFeaturesRoute', () => {
  it('enforces the compact inference document contract', () => {
    expect(
      route.params.safeParse(createParams([{ _id: '1', fields: { message: 'ok' } }])).success
    ).toBe(true);
    expect(route.params.safeParse(createParams([])).success).toBe(false);
    expect(
      route.params.safeParse(
        createParams([
          {
            _id: '1',
            fields: Object.fromEntries(
              Array.from({ length: MAX_INFERENCE_DOCUMENT_FIELDS + 1 }, (_, index) => [
                `field-${index}`,
                'value',
              ])
            ),
          },
        ])
      ).success
    ).toBe(false);
    expect(
      route.params.safeParse(
        createParams([
          {
            _id: '1',
            fields: { ['x'.repeat(MAX_INFERENCE_FIELD_NAME_LENGTH + 1)]: 'value' },
          },
        ])
      ).success
    ).toBe(false);
    expect(
      route.params.safeParse(
        createParams([{ _id: '1', fields: { message: 'x'.repeat(MAX_INFERENCE_DOCUMENT_BYTES) } }])
      ).success
    ).toBe(false);
    expect(
      route.params.safeParse(
        createParams(
          Array.from({ length: 30 }, (_, index) => ({
            _id: `${index}`,
            fields: { message: 'x'.repeat(30_000) },
          }))
        )
      ).success
    ).toBe(false);
  });
});
