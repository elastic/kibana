/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock heavy synchronous callees so setup() can run without real plugin deps.
// The focus of this test is lifecycle ordering, not the behaviour of these callees.
jest.mock('./lib/sig_events/rules/register_rules');
jest.mock('./lib/saved_objects/register_saved_objects');
jest.mock('./register_significant_events_inference_features');
jest.mock('./register_suggestions_inference_features');
jest.mock('./feature_flags');
jest.mock('./lib/streams/attachments/attachment_service');
jest.mock('./lib/streams/service');
jest.mock('./lib/streams/ki');
jest.mock('./lib/content/content_service');
jest.mock('./lib/tasks/task_service', () => ({
  TaskService: jest.fn().mockImplementation(() => ({ registerTasks: jest.fn() })),
}));
jest.mock('./lib/streams/ingest_pipelines/processor_suggestions_service');
jest.mock('./lib/pattern_extraction/pattern_extraction_service');
jest.mock('./lib/sig_events/significant_events_clients', () => ({
  createSignificantEventsServices: jest.fn().mockReturnValue({}),
  createSignificantEventsClients: jest.fn().mockReturnValue({}),
  initializeSignificantEventsTemplates: jest.fn(),
}));
jest.mock('./lib/workflows/create_workflow_clients', () => ({
  createWorkflowClients: jest.fn().mockReturnValue({ streamsKIsOnboardingClient: undefined }),
}));
jest.mock('./lib/telemetry', () => ({
  EbtTelemetryService: jest.fn().mockImplementation(() => ({
    setup: jest.fn(),
    getClient: jest.fn().mockReturnValue({}),
  })),
  StatsTelemetryService: jest.fn().mockImplementation(() => ({
    setup: jest.fn(),
  })),
}));
jest.mock('./register_fields_metadata_extractors');
jest.mock('./routes', () => ({ streamsRouteRepository: {} }));
jest.mock('@kbn/server-route-repository', () => ({ registerRoutes: jest.fn() }));

import { coreMock } from '@kbn/core/server/mocks';
import { StreamsPlugin } from './plugin';

describe('StreamsPlugin', () => {
  it('registers the significant_event SML type during setup(), not start()', () => {
    // If this test fails it means the registerType call was moved back into a
    // getStartServices().then() block (or any deferred path), which causes
    // agent_context_layer to schedule the crawler without the type — nothing
    // ever lands in .chat-sml-data and @ mention shows zero significant events.
    const registerSmlType = jest.fn();

    const plugin = new StreamsPlugin(
      coreMock.createPluginInitializerContext({
        preconfigured: { enabled: false, stream_definitions: [] },
        workers: {
          patternExtraction: {
            enabled: true,
            minThreads: 0,
            maxThreads: 2,
            maxQueue: 10,
            idleTimeout: '30s',
            taskTimeout: '30s',
          },
        },
      })
    );

    plugin.setup(coreMock.createSetup() as never, {
      agentContextLayer: { registerType: registerSmlType },
      features: { registerKibanaFeature: jest.fn() },
      taskManager: { registerTaskDefinitions: jest.fn() },
      encryptedSavedObjects: {},
      alerting: {},
      ruleRegistry: {},
      usageCollection: {},
      fieldsMetadata: {},
    } as never);

    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'significant_event' })
    );
  });
});
