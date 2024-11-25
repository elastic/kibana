/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationFieldResponse } from '../../schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

/**
 * This query returns open and acknowledged (non-building block) alerts in the last 24 hours.
 *
 * The alerts are ordered by risk score, and then from the most recent to the oldest.
 */
export const getOpenAndAcknowledgedAlertsQuery = ({
  alertsIndexPattern,
  anonymizationFields,
  size,
}: {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  size: number;
}) => ({
  allow_no_indices: true,
  body: {
    fields: anonymizationFields
      .filter((fieldItem) => fieldItem.allowed)
      .map((fieldItem) => ({
        field: fieldItem.field,
        include_unmapped: true,
      })),
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          'kibana.alert.workflow_status': 'open',
                        },
                      },
                      {
                        match_phrase: {
                          'kibana.alert.workflow_status': 'acknowledged',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-24h',
                      lte: 'now',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
              should: [],
              must_not: [
                {
                  exists: {
                    field: 'kibana.alert.building_block_type',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    runtime_mappings: {},
    size,
    sort: [
      {
        'kibana.alert.risk_score': {
          order: 'desc',
        },
      },
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: false,
  },
  ignore_unavailable: true,
  index: [alertsIndexPattern],
});
