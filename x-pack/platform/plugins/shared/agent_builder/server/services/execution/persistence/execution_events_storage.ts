/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { MappingsDefinition, GetFieldsOf } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import type { ChatEvent } from '@kbn/agent-builder-common';

export const executionEventsDataStreamName = '.kibana-agent-execution-events';

const executionEventsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    agent_execution_id: mappings.keyword(),
    event_number: mappings.integer(),
    agent_id: mappings.keyword(),
    space_id: mappings.keyword(),
    event: mappings.object({ dynamic: false, properties: {} }),
  },
} satisfies MappingsDefinition;

/**
 * The document type for agent execution events in the data stream.
 */
export interface ExecutionEventDocument extends GetFieldsOf<typeof executionEventsMappings> {
  '@timestamp': number;
  agent_execution_id: string;
  event_number: number;
  agent_id: string;
  space_id: string;
  event: ChatEvent;
}

export type ExecutionEventsDataStreamClient = IDataStreamClient<
  typeof executionEventsMappings,
  ExecutionEventDocument
>;

/**
 * Register the agent execution events data stream.
 * Must be called during plugin setup.
 */
export const registerExecutionEventsDataStream = (dataStreams: DataStreamsSetup): void => {
  dataStreams.registerDataStream({
    name: executionEventsDataStreamName,
    version: 1,
    template: {
      mappings: executionEventsMappings,
    },
  });
};

/**
 * Initialize the data stream client.
 * Called lazily from the execution events client.
 */
export const initializeExecutionEventsDataStreamClient = (
  dataStreams: DataStreamsStart
): Promise<ExecutionEventsDataStreamClient> => {
  return dataStreams.initializeClient(executionEventsDataStreamName);
};
