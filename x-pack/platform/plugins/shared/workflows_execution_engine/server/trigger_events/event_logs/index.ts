/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { WORKFLOWS_EVENTS_DATA_STREAM } from './constants';
export {
  initializeTriggerEventsDataStream,
  initializeTriggerEventsClient,
  type TriggerEventDocument,
  type TriggerEventsDataStreamClient,
  writeTriggerEvent,
} from './trigger_events_data_stream';
