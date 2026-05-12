/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { Verdict } from '@kbn/streams-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const VERDICTS_DATA_STREAM = '.significant_events-verdicts';

export const verdictsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    verdict: mappings.keyword(),
    verdict_id: mappings.keyword(),
    discovery_id: mappings.keyword(),
    discovery_slug: mappings.keyword(),
    rule_names: mappings.keyword(),
    stream_names: mappings.keyword(),
    recommended_action: mappings.keyword(),
    title: mappings.text({
      fields: {
        keyword: { type: 'keyword', ignore_above: 512 },
      },
    }),
    summary: mappings.text(),
    root_cause: mappings.text(),
    verdict_summary: mappings.text(),
    assessment_note: mappings.text(),
    recommendations: mappings.text(),
  },
} satisfies MappingsDefinition;

export type StoredVerdict = GetFieldsOf<typeof verdictsMappings>;
export type { Verdict };

export const verdictsDataStream: DataStreamDefinition<typeof verdictsMappings, StoredVerdict> = {
  name: VERDICTS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: verdictsMappings,
  },
};
