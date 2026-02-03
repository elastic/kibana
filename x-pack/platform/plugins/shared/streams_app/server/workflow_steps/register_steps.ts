/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { streamsListStreamsStepDefinition } from './streams_list_streams_step';
import { streamsGetStreamStepDefinition } from './streams_get_stream_step';
import { streamsGetSignificantEventsStepDefinition } from './streams_get_significant_events_step';
import { streamsListFeaturesStepDefinition } from './streams_list_features_step';

export const registerServerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(streamsListStreamsStepDefinition);
  workflowsExtensions.registerStepDefinition(streamsGetStreamStepDefinition);
  workflowsExtensions.registerStepDefinition(streamsGetSignificantEventsStepDefinition);
  workflowsExtensions.registerStepDefinition(streamsListFeaturesStepDefinition);
};
