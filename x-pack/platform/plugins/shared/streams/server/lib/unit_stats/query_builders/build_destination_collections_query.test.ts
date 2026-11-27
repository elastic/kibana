/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildDestinationCollectionsQuery } from './build_destination_collections_query';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("es-prod", "es-dev")`;

describe('buildDestinationCollectionsQuery', () => {
  it('keeps the collections of each destination that kept at least one document', () => {
    expect(buildDestinationCollectionsQuery(params).print('basic')).toBe(
      `${head} | WHERE metrics.streams.destination.items IS NOT NULL AND attributes.db.collection.name IS NOT NULL AND attributes.db.collection.name != "${UNIT_METRICS_STREAM}" | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS success_items = SUM(delta) WHERE attributes.outcome == "success", failure_store_items = SUM(delta) WHERE attributes.outcome == "failure_store" AND attributes.failure_store == "used" BY id = scope.attributes.streams.destination.id, collection = attributes.db.collection.name | EVAL documents = COALESCE(success_items, 0.0) - COALESCE(failure_store_items, 0.0) | WHERE documents > 0 | KEEP id, collection, documents | LIMIT 10000`
    );
  });
});
