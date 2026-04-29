/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  EVENT_ID,
  EVENT_CAUSE_KIS,
  EVENT_CAUSE_KIS_ID,
  EVENT_CAUSE_KIS_NAME,
  EVENT_CAUSE_KIS_STREAM_NAME,
  EVENT_CRITICALITY,
  EVENT_EVIDENCES,
  EVENT_EVIDENCES_COLLECTED_AT,
  EVENT_EVIDENCES_CONFIRMED,
  EVENT_EVIDENCES_DESCRIPTION,
  EVENT_EVIDENCES_ESQL_QUERY,
  EVENT_EVIDENCES_ROW_COUNT,
  EVENT_EVIDENCES_RULE_NAME,
  EVENT_EVIDENCES_STREAM_NAME,
  EVENT_IMPACT,
  EVENT_ROOT_CAUSE,
  EVENT_RULE_NAMES,
  EVENT_STREAM_NAMES,
  EVENT_SUMMARY,
  EVENT_TITLE,
  EVENT_VERDICT,
  EVENT_WORKFLOW_EXECUTION_ID,
} from './fields';

export const EVENTS_INDEX_NAME = '.kibana_streams_sig_events';

export const eventsStorageSettings = {
  name: EVENTS_INDEX_NAME,
  schema: {
    properties: {
      [EVENT_ID]: types.keyword(),
      [EVENT_VERDICT]: types.keyword(),
      [EVENT_TITLE]: types.text(),
      [EVENT_SUMMARY]: types.text(),
      [EVENT_ROOT_CAUSE]: types.text(),
      [EVENT_STREAM_NAMES]: types.keyword(),
      [EVENT_RULE_NAMES]: types.keyword(),
      [EVENT_WORKFLOW_EXECUTION_ID]: types.keyword(),
      [EVENT_CRITICALITY]: types.double(),
      [EVENT_IMPACT]: types.text(),
      [EVENT_EVIDENCES]: types.object(),
      [EVENT_EVIDENCES_STREAM_NAME]: types.keyword(),
      [EVENT_EVIDENCES_RULE_NAME]: types.text(),
      [EVENT_EVIDENCES_DESCRIPTION]: types.text(),
      [EVENT_EVIDENCES_ESQL_QUERY]: types.match_only_text(),
      [EVENT_EVIDENCES_CONFIRMED]: types.boolean(),
      [EVENT_EVIDENCES_COLLECTED_AT]: types.date(),
      [EVENT_EVIDENCES_ROW_COUNT]: types.long(),
      [EVENT_CAUSE_KIS]: types.object(),
      [EVENT_CAUSE_KIS_ID]: types.keyword(),
      [EVENT_CAUSE_KIS_NAME]: types.text(),
      [EVENT_CAUSE_KIS_STREAM_NAME]: types.keyword(),
    },
  },
} satisfies IndexStorageSettings;

export type EventsStorageSettings = typeof eventsStorageSettings;
